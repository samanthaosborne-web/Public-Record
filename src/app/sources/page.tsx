import type { Metadata } from "next";
import { getRepository } from "@/lib/data";
import { SOURCE_TIER } from "@/lib/labels";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SourceList, TierLegend } from "@/components/sources/SourceList";

export const metadata: Metadata = { title: "Source register" };

export default async function SourcesPage() {
  const repo = await getRepository();
  const sources = await repo.listSources();
  const real = sources.filter((s) => !s.isDemonstration);
  const demo = sources.filter((s) => s.isDemonstration);
  return (
    <Container className="py-10">
      <SectionHeading as="h1" title="Source register" description="Every source cited anywhere on PUBLIC RECORD, by tier. Links go directly to original documents." />
      <TierLegend />
      {([1, 2, 3] as const).map((tier) => {
        const rows = real.filter((s) => s.tier === tier);
        if (rows.length === 0) return null;
        return (
          <section key={tier} className="mt-8">
            <h2 className="mb-2 font-serif text-xl">
              {SOURCE_TIER[tier].label} <span className="font-mono text-sm text-ink-faint">{rows.length}</span>
            </h2>
            <div className="rounded-lg border border-line bg-surface px-4">
              <SourceList sources={rows} compact />
            </div>
          </section>
        );
      })}
      <section className="mt-10">
        <h2 className="mb-2 font-serif text-xl">
          Demonstration sources <span className="font-mono text-sm text-ink-faint">{demo.length}</span>
        </h2>
        <p className="mb-2 text-xs text-ink-muted">Fictional documents that support the demonstration records. Each opens a placeholder page inside this site.</p>
        <div className="rounded-lg border border-dashed border-line-strong bg-surface px-4">
          <SourceList sources={demo} compact />
        </div>
      </section>
    </Container>
  );
}
