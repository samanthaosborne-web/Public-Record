import type { Metadata } from "next";
import { getRepository } from "@/lib/data";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ConductRecordCard } from "@/components/conduct/ConductRecord";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Serious conduct matters" };

export default async function ConductPage() {
  const repo = await getRepository();
  const items = await repo.listConductMatters();
  return (
    <Container className="py-10">
      <SectionHeading as="h1" title="Serious conduct matters" description="Publicly documented sexual assault or serious misconduct allegations involving federal politicians, with the legal status of each matter displayed as prominently as the allegation." />
      <div className="rounded-lg border border-line bg-surface p-4 text-sm">
        <p className="label-caps text-ink-faint">Evidence rules for this section</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-muted">
          <li>A matter is entered only if supported by an official court, police or parliamentary record, or by substantial reporting from credible, established news organisations.</li>
          <li>Never from anonymous social-media accounts, forums, blogs, gossip sites or unsourced AI output.</li>
          <li>Every entry states whether it is an allegation, police report, police investigation, civil proceeding, criminal charge, trial, conviction, acquittal, withdrawn matter, no charges laid, closed investigation or overturned finding.</li>
          <li>The politician’s publicly reported response or denial is always displayed where available.</li>
          <li>Nothing in this section is published without human review.</li>
        </ul>
      </div>
      <p className="mt-4 text-xs text-ink-faint">{items.length} matter{items.length === 1 ? "" : "s"}. All current records are demonstration data involving fictional politicians.</p>
      <div className="mt-4 space-y-4">{items.length === 0 ? <EmptyState /> : items.map((m) => <ConductRecordCard key={m.matter.id} item={m} />)}</div>
    </Container>
  );
}
