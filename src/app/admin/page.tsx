import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getRepository } from "@/lib/data";
import type { ReviewStatus } from "@/lib/types";
import { REVIEW_STATUS } from "@/lib/labels";
import { one, qs, type SearchParams } from "@/lib/params";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FilterChips } from "@/components/search/FilterChips";
import { ReviewQueue } from "@/components/admin/ReviewQueue";

export const metadata: Metadata = { title: "Review queue" };

const STATUSES = Object.keys(REVIEW_STATUS) as ReviewStatus[];

export default async function AdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection();
  const sp = await searchParams;
  const status = one(sp.status);
  const valid = status && STATUSES.includes(status as ReviewStatus) ? (status as ReviewStatus) : "pending";
  const showAll = status === "all";
  const repo = await getRepository();
  const [all, items, politicians] = await Promise.all([repo.listReviewQueue(), repo.listReviewQueue(showAll ? {} : { status: valid }), repo.listPoliticians({ includeDemonstration: true })]);
  const decided = one(sp.decided);

  return (
    <Container className="py-10">
      <SectionHeading
        as="h1"
        eyebrow="Admin"
        title="Review queue"
        description="AI-discovered records, public submissions and politician responses wait here until a reviewer approves, edits, rejects, requests more evidence or marks them duplicate. Nothing is published without a human decision, and serious matters can never be auto-published."
      />
      <div className="mb-4 rounded border border-line bg-paper-deep/60 px-4 py-2 text-xs text-ink-muted">
        Prototype note: this screen is open in the prototype and decisions are held in memory for the running server. In production it sits behind reviewer authentication and writes to the review_queue table. See{" "}
        <Link href="/methodology" className="underline underline-offset-4">
          the methodology
        </Link>{" "}
        for the review rules.
      </div>
      {decided && (
        <p className="mb-4 rounded border border-status-green/40 bg-status-green-bg px-4 py-2 text-sm text-status-green">
          Decision recorded for <span className="font-mono">{decided}</span>.
        </p>
      )}
      <div className="mb-4 rounded-lg border border-line bg-surface p-4">
        <FilterChips
          label="Status"
          options={[
            { label: "All", href: `/admin${qs({ status: "all" })}`, active: showAll, count: all.length },
            ...STATUSES.map((s) => ({ label: REVIEW_STATUS[s].label, href: `/admin${qs({ status: s })}`, active: !showAll && valid === s, count: all.filter((i) => i.status === s).length })),
          ]}
        />
      </div>
      <ReviewQueue items={items} politicians={new Map(politicians.map((p) => [p.id, p]))} />
    </Container>
  );
}
