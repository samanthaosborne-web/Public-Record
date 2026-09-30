import type { Metadata } from "next";
import { getRepository } from "@/lib/data";
import type { EvidenceStatus, PartyId } from "@/lib/types";
import { EVIDENCE_STATUS, EVIDENCE_STATUS_ORDER } from "@/lib/labels";
import { one, qs, type SearchParams } from "@/lib/params";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FilterChips } from "@/components/search/FilterChips";
import { ClaimCard } from "@/components/claims/ClaimCard";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Claims" };

export default async function ClaimsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const repo = await getRepository();
  const [parties, issues, all] = await Promise.all([repo.listParties(), repo.listIssues(), repo.listClaims()]);
  const status = one(sp.status);
  const party = one(sp.party);
  const issue = one(sp.issue);
  const validStatus = status && status in EVIDENCE_STATUS ? (status as EvidenceStatus) : undefined;
  const validParty = party && parties.some((p) => p.id === party) ? (party as PartyId) : undefined;
  const validIssue = issue ? issues.find((i) => i.slug === issue)?.id : undefined;
  const claims = await repo.listClaims({ status: validStatus, partyId: validParty, issueId: validIssue });

  const link = (patch: Record<string, string | undefined>) => `/claims${qs({ status, party, issue, ...patch })}`;
  const countBy = (pred: (c: (typeof all)[number]) => boolean) => all.filter(pred).length;

  return (
    <Container className="py-10">
      <SectionHeading
        as="h1"
        title="Claims"
        description="Each factual claim is an individual record with its own evidence panel. Opinion and predictions are logged but not assessed. Newest first."
      />
      <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
        <FilterChips
          label="Evidence status"
          options={[
            { label: "All", href: link({ status: undefined }), active: !validStatus, count: all.length },
            ...EVIDENCE_STATUS_ORDER.map((s) => ({ label: EVIDENCE_STATUS[s].short, href: link({ status: s }), active: validStatus === s, count: countBy((c) => c.assessment.status === s) })),
          ]}
        />
        <FilterChips
          label="Party"
          options={[
            { label: "All", href: link({ party: undefined }), active: !validParty },
            ...parties
              .filter((p) => all.some((c) => c.party.id === p.id))
              .map((p) => ({ label: p.shortName + (p.isDemonstration ? " (demo)" : ""), href: link({ party: p.id }), active: validParty === p.id, accent: p.accentColour, count: countBy((c) => c.party.id === p.id) })),
          ]}
        />
        <FilterChips
          label="Issue"
          options={[
            { label: "All", href: link({ issue: undefined }), active: !validIssue },
            ...issues.filter((i) => all.some((c) => c.claim.issueIds.includes(i.id))).map((i) => ({ label: i.name, href: link({ issue: i.slug }), active: validIssue === i.id, count: countBy((c) => c.claim.issueIds.includes(i.id)) })),
          ]}
        />
      </div>

      <p className="mt-4 text-xs text-ink-faint">
        {claims.length} claim{claims.length === 1 ? "" : "s"}. All current claim records are demonstration data involving fictional politicians; verified claims about real politicians are published only after human review.
      </p>

      <div className="mt-4 space-y-4">
        {claims.length === 0 ? <EmptyState title="No claims match these filters." /> : claims.map((item) => <ClaimCard key={item.claim.id} item={item} />)}
      </div>
    </Container>
  );
}
