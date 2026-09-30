import type { Metadata } from "next";
import Link from "next/link";
import { getRepository } from "@/lib/data";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = { title: "Issues" };

export default async function IssuesPage() {
  const repo = await getRepository();
  const [issues, claims] = await Promise.all([repo.listIssues(), repo.listClaims()]);
  return (
    <Container className="py-10">
      <SectionHeading
        as="h1"
        title="Issues"
        description="Factual claims from politicians across parties about the same subject, each with its evidence. PUBLIC RECORD does not decide which policy position is preferable; it shows the evidence relating to each factual assertion."
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {issues.map((issue) => {
          const on = claims.filter((c) => c.claim.issueIds.includes(issue.id));
          const parties = new Set(on.map((c) => c.party.id));
          return (
            <li key={issue.id}>
              <Link href={`/issues/${issue.slug}`} className="flex h-full flex-col rounded-lg border border-line bg-surface p-5 shadow-card transition-colors hover:border-line-strong">
                <h2 className="font-serif text-xl uppercase tracking-wide">{issue.name}</h2>
                <p className="mt-1.5 text-sm text-ink-muted">{issue.description}</p>
                <p className="mt-auto pt-4 text-xs text-ink-faint">
                  {on.length} claim{on.length === 1 ? "" : "s"} · {parties.size} part{parties.size === 1 ? "y" : "ies"}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
