import type { Metadata } from "next";
import { getRepository } from "@/lib/data";
import type { IntegrityStatus } from "@/lib/types";
import { INTEGRITY_STATUS, INTEGRITY_STATUS_ORDER } from "@/lib/labels";
import { one, qs, type SearchParams } from "@/lib/params";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FilterChips } from "@/components/search/FilterChips";
import { IntegrityRecordCard } from "@/components/integrity/IntegrityRecord";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Integrity matters" };

export default async function IntegrityPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const repo = await getRepository();
  const all = await repo.listIntegrityMatters();
  const status = one(sp.status);
  const valid = status && status in INTEGRITY_STATUS ? (status as IntegrityStatus) : undefined;
  const items = valid ? all.filter((m) => m.matter.status === valid) : all;
  return (
    <Container className="py-10">
      <SectionHeading
        as="h1"
        title="Integrity matters"
        description="Referrals, investigations, findings and outcomes involving integrity bodies, police, prosecutors, electoral authorities, parliamentary committees, courts and the Auditor-General. Each record carries an exact lifecycle status. An allegation is never treated as a finding, and matters that clear a person are shown with equal prominence."
      />
      <div className="rounded-lg border border-line bg-surface p-4">
        <FilterChips
          label="Status"
          options={[
            { label: "All", href: `/integrity`, active: !valid, count: all.length },
            ...INTEGRITY_STATUS_ORDER.filter((s) => all.some((m) => m.matter.status === s)).map((s) => ({ label: INTEGRITY_STATUS[s].label, href: `/integrity${qs({ status: s })}`, active: valid === s, count: all.filter((m) => m.matter.status === s).length })),
          ]}
        />
      </div>
      <p className="mt-4 text-xs text-ink-faint">{items.length} matter{items.length === 1 ? "" : "s"}. All current records are demonstration data involving fictional politicians.</p>
      <div className="mt-4 space-y-4">{items.length === 0 ? <EmptyState /> : items.map((m) => <IntegrityRecordCard key={m.matter.id} item={m} />)}</div>
    </Container>
  );
}
