import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { SOURCE_KIND, SOURCE_TIER } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { Container } from "@/components/ui/Container";
import { TierBadge } from "@/components/ui/StatusBadge";

export const metadata: Metadata = { title: "Demonstration document" };

/**
 * Demonstration sources point here instead of at a real document, so that
 * every link on a fictional record still resolves. Real records link
 * directly to the original document on the publisher's site.
 */
export default async function DemoSourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepository();
  const source = await repo.getSource(id);
  if (!source || !source.isDemonstration) notFound();
  return (
    <Container className="py-10" narrow>
      <p className="rounded border border-dashed border-line-strong bg-paper-deep/60 px-4 py-3 text-sm text-ink-muted">
        <span className="font-semibold text-ink">Demonstration document.</span> This is a placeholder for a fictional source used in PUBLIC RECORD’s demonstration records. In production, this link would open the original document on the publisher’s website.
      </p>
      <article className="mt-6 rounded-lg border border-line bg-surface p-6">
        <div className="flex flex-wrap items-center gap-2">
          <TierBadge tier={source.tier} />
          <span className="text-xs text-ink-faint">{SOURCE_KIND[source.kind]}</span>
        </div>
        <h1 className="mt-3 font-serif text-2xl">{source.title}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {source.publisher}
          {source.publishedAt ? ` · ${formatDate(source.publishedAt)}` : ""}
        </p>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="label-caps text-ink-faint">What this document would establish</dt>
            <dd className="mt-1">{source.note ?? "—"}</dd>
          </div>
          <div>
            <dt className="label-caps text-ink-faint">Source tier</dt>
            <dd className="mt-1">{SOURCE_TIER[source.tier].label}</dd>
          </div>
          <div>
            <dt className="label-caps text-ink-faint">Accessed</dt>
            <dd className="mt-1">{formatDate(source.accessedAt)}</dd>
          </div>
          <div>
            <dt className="label-caps text-ink-faint">Record ID</dt>
            <dd className="mt-1 font-mono text-xs">{source.id}</dd>
          </div>
        </dl>
      </article>
      <p className="mt-4 text-xs text-ink-faint">
        <Link href="/sources" className="underline underline-offset-4">
          Source register
        </Link>
      </p>
    </Container>
  );
}
