import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import type { ClaimDetail } from "@/lib/data/repository";
import type { PartyId } from "@/lib/types";
import { EVIDENCE_STATUS } from "@/lib/labels";
import { one, qs, type SearchParams } from "@/lib/params";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FilterChips } from "@/components/search/FilterChips";
import { ClaimCard } from "@/components/claims/ClaimCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { EvidenceBadge } from "@/components/ui/StatusBadge";
import { PartyTag } from "@/components/ui/PartyTag";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const repo = await getRepository();
  const issue = await repo.getIssueBySlug(slug);
  return { title: issue ? `${issue.name} — claims and evidence` : "Issue" };
}

export default async function IssuePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const repo = await getRepository();
  const issue = await repo.getIssueBySlug(slug);
  if (!issue) notFound();
  const [parties, all] = await Promise.all([repo.listParties(), repo.listClaims({ issueId: issue.id })]);
  const partyParam = one(sp.party);
  const validParty = partyParam && parties.some((p) => p.id === partyParam) ? (partyParam as PartyId) : undefined;
  const claims = validParty ? all.filter((c) => c.party.id === validParty) : all;
  const details = (await Promise.all(claims.map((c) => repo.getClaim(c.claim.id)))).filter((d): d is ClaimDetail => d !== null);
  const detailById = new Map(details.map((d) => [d.claim.id, d]));

  // Neutral breakdown: claims per party, by evidence status. Sorted alphabetically, never ranked.
  const partiesPresent = parties.filter((p) => all.some((c) => c.party.id === p.id)).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Container className="py-10">
      <Breadcrumbs items={[{ label: "Issues", href: "/issues" }, { label: issue.name }]} />
      <SectionHeading as="h1" title={issue.name.toUpperCase()} description={issue.description} />

      {partiesPresent.length > 0 && (
        <div className="mb-6 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-sm">
            <caption className="label-caps px-4 pt-3 text-left text-ink-faint">Claims on this issue by party (alphabetical; not a ranking)</caption>
            <thead>
              <tr className="text-left text-xs text-ink-muted">
                <th className="px-4 py-2 font-medium">Party</th>
                <th className="px-4 py-2 font-medium">Claims</th>
                <th className="px-4 py-2 font-medium">Statuses</th>
              </tr>
            </thead>
            <tbody>
              {partiesPresent.map((p) => {
                const rows = all.filter((c) => c.party.id === p.id);
                const statuses = Object.keys(EVIDENCE_STATUS).filter((s) => rows.some((c) => c.assessment.status === s)) as (keyof typeof EVIDENCE_STATUS)[];
                return (
                  <tr key={p.id} className="border-t border-line">
                    <td className="px-4 py-2">
                      <PartyTag party={p} full />
                    </td>
                    <td className="px-4 py-2 font-mono">{rows.length}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1.5">
                        {statuses.map((s) => (
                          <span key={s} className="inline-flex items-center gap-1 text-xs">
                            <EvidenceBadge status={s} size="sm" short />
                            <span className="font-mono text-ink-faint">{rows.filter((c) => c.assessment.status === s).length}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-lg border border-line bg-surface p-4">
        <FilterChips
          label="Party"
          options={[
            { label: "All", href: `/issues/${issue.slug}`, active: !validParty, count: all.length },
            ...partiesPresent.map((p) => ({ label: p.shortName + (p.isDemonstration ? " (demo)" : ""), href: `/issues/${issue.slug}${qs({ party: p.id })}`, active: validParty === p.id, accent: p.accentColour, count: all.filter((c) => c.party.id === p.id).length })),
          ]}
        />
      </div>

      <div className="mt-4 space-y-4">
        {claims.length === 0 ? (
          <EmptyState title="No claims on this issue yet.">Claims are added as they are checked. Submit a claim with its source through the correction form.</EmptyState>
        ) : (
          claims.map((item) => <ClaimCard key={item.claim.id} item={item} detail={detailById.get(item.claim.id)} />)
        )}
      </div>
    </Container>
  );
}
