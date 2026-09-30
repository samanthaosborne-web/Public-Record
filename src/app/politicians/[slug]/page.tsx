import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import type { ClaimDetail } from "@/lib/data/repository";
import { formatDate } from "@/lib/format";
import { POSITION_TYPE } from "@/lib/labels";
import { one, type SearchParams } from "@/lib/params";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PoliticianAvatar } from "@/components/politicians/PoliticianAvatar";
import { PartyTag } from "@/components/ui/PartyTag";
import { DemoBadge, DemoNotice } from "@/components/ui/DemoBadge";
import { SourceLink } from "@/components/ui/SourceLink";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClaimCard } from "@/components/claims/ClaimCard";
import { IntegrityRecordCard } from "@/components/integrity/IntegrityRecord";
import { ConductRecordCard } from "@/components/conduct/ConductRecord";
import { SourceList } from "@/components/sources/SourceList";
import { CorrectionBadge, EvidenceBadge } from "@/components/ui/StatusBadge";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "claims", label: "Claims" },
  { id: "corrections", label: "Corrections" },
  { id: "integrity", label: "Integrity" },
  { id: "conduct", label: "Serious conduct" },
  { id: "sources", label: "Sources" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const repo = await getRepository();
  const p = await repo.getPoliticianBySlug(slug);
  return { title: p ? `${p.fullName} — ${p.positionSummary}` : "Politician" };
}

export default async function PoliticianPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const repo = await getRepository();
  const profile = await repo.getPoliticianProfile(slug);
  if (!profile) notFound();
  const { politician, party, stats, claims, corrections, integrityMatters, conductMatters, sources, verificationSources, changeLog } = profile;
  const tabParam = one(sp.tab);
  const tab: TabId = TABS.some((t) => t.id === tabParam) ? (tabParam as TabId) : "overview";
  const seat = politician.chamber === "house" ? `Member for ${politician.electorate}, ${politician.state}` : `Senator for ${politician.state}`;

  const claimDetails: ClaimDetail[] =
    tab === "claims" || tab === "overview"
      ? (await Promise.all(claims.map((c) => repo.getClaim(c.claim.id)))).filter((d): d is ClaimDetail => d !== null)
      : [];
  const detailById = new Map(claimDetails.map((d) => [d.claim.id, d]));

  const counts: Record<TabId, number | null> = {
    overview: null,
    claims: claims.length,
    corrections: corrections.length,
    integrity: integrityMatters.length,
    conduct: conductMatters.length,
    sources: sources.length + verificationSources.length,
  };

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: "Politicians", href: "/politicians" }, { label: politician.fullName }]} />

      <header className="rounded-lg border border-line bg-surface p-5 shadow-card sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <PoliticianAvatar name={politician.fullName} photoUrl={politician.photoUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-3xl leading-tight sm:text-4xl">{politician.fullName}</h1>
              {politician.isDemonstration && <DemoBadge long />}
            </div>
            <p className="mt-1.5">
              <PartyTag party={party} full className="text-sm" />
            </p>
            {politician.partyNote && <p className="mt-1 text-xs text-ink-faint">{politician.partyNote}</p>}
            <p className="mt-2 text-base font-medium text-ink">{politician.positionSummary}</p>
            <p className="text-sm text-ink-muted">{seat}</p>

            <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="label-caps text-ink-faint">Current positions</dt>
                <dd className="mt-1">
                  <ul className="space-y-0.5">
                    {politician.positions.map((p) => (
                      <li key={p.title} className="flex flex-wrap items-baseline gap-x-2">
                        <span>{p.title}</span>
                        <span className="text-xs text-ink-faint">
                          {POSITION_TYPE[p.type]}
                          {p.since ? ` · since ${formatDate(p.since)}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div className="space-y-2">
                <div>
                  <dt className="label-caps text-ink-faint">Official parliamentary profile</dt>
                  <dd className="mt-1">
                    {politician.aphProfileUrl ? <SourceLink href={politician.aphProfileUrl}>Parliament of Australia profile</SourceLink> : <span className="text-ink-faint">Demonstration profile (no real record)</span>}
                  </dd>
                </div>
                <div>
                  <dt className="label-caps text-ink-faint">Official website</dt>
                  <dd className="mt-1">{politician.officialWebsite ? <SourceLink href={politician.officialWebsite}>{politician.officialWebsite.replace(/^https?:\/\//, "").replace(/\/$/, "")}</SourceLink> : <span className="text-ink-faint">None listed</span>}</dd>
                </div>
                <div>
                  <dt className="label-caps text-ink-faint">Last record update</dt>
                  <dd className="mt-1">{formatDate(politician.lastRecordUpdate)}</dd>
                </div>
              </div>
            </dl>
            {politician.photoCredit && politician.photoUrl && <p className="mt-3 text-[0.6875rem] text-ink-faint">Portrait: {politician.photoCredit}.</p>}
          </div>
        </div>
      </header>

      {politician.isDemonstration && (
        <div className="mt-4">
          <DemoNotice />
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Claims checked" value={stats.claimsChecked} />
        <StatTile label="Contradicted by evidence" value={stats.claimsContradicted} />
        <StatTile label="Corrections / clarifications" value={stats.corrections} />
        <StatTile label="Integrity matters" value={stats.integrityMatters} />
        <StatTile label="Serious conduct matters" value={stats.conductMatters} />
        <StatTile label="Opinion / not checkable" value={stats.claimsNotCheckable} note="Logged, not assessed" />
      </div>

      <nav aria-label="Profile sections" className="mt-8 border-b border-line">
        <ul className="-mb-px flex flex-wrap gap-x-1 overflow-x-auto">
          {TABS.map((t) => (
            <li key={t.id}>
              <Link
                href={`/politicians/${politician.slug}${t.id === "overview" ? "" : `?tab=${t.id}`}`}
                aria-current={tab === t.id ? "page" : undefined}
                className={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold uppercase tracking-wide ${
                  tab === t.id ? "border-ink text-ink" : "border-transparent text-ink-muted hover:border-line-strong hover:text-ink"
                }`}
              >
                {t.label}
                {counts[t.id] !== null && <span className="rounded bg-paper-deep px-1.5 font-mono text-[0.625rem] text-ink-muted">{counts[t.id]}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="mt-6" aria-live="polite">
        {tab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <h2 className="label-caps text-ink-faint">Most recent claims</h2>
              {claims.length === 0 ? (
                <EmptyState>
                  No claims by {politician.fullName} have been checked and published yet. Candidate claims are drafted by the daily pipeline and published only after human review.
                </EmptyState>
              ) : (
                claims.slice(0, 3).map((item) => <ClaimCard key={item.claim.id} item={item} detail={detailById.get(item.claim.id)} showPolitician={false} />)
              )}
              {claims.length > 3 && (
                <p className="text-sm">
                  <Link href={`/politicians/${politician.slug}?tab=claims`} className="text-accent underline underline-offset-4">
                    All {claims.length} claims →
                  </Link>
                </p>
              )}
            </div>
            <aside className="space-y-4">
              <div className="rounded-lg border border-line bg-surface p-4">
                <h2 className="label-caps text-ink-faint">Integrity matters</h2>
                {integrityMatters.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-muted">No verified records added yet.</p>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm">
                    {integrityMatters.map((m) => (
                      <li key={m.matter.id}>
                        <Link href={`/integrity/${m.matter.id}`} className="hover:underline">
                          {m.matter.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-lg border border-line bg-surface p-4">
                <h2 className="label-caps text-ink-faint">Serious conduct matters</h2>
                {conductMatters.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-muted">No verified records added yet.</p>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm">
                    {conductMatters.map((m) => (
                      <li key={m.matter.id}>
                        <Link href={`/conduct/${m.matter.id}`} className="hover:underline">
                          {m.matter.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-lg border border-line bg-surface p-4">
                <h2 className="label-caps text-ink-faint">Profile verification</h2>
                <p className="mt-2 text-xs text-ink-muted">
                  Verified {formatDate(politician.verification.verifiedAt)} against {verificationSources.length} source{verificationSources.length === 1 ? "" : "s"}.
                  {politician.verification.notes ? ` ${politician.verification.notes}` : ""}
                </p>
                <div className="mt-2">
                  <SourceList sources={verificationSources} compact />
                </div>
              </div>
              <div className="rounded-lg border border-line bg-surface p-4 text-sm">
                <Link href={`/submit?type=politician&id=${politician.id}`} className="text-accent underline underline-offset-4">
                  Submit correction or additional evidence
                </Link>
                <p className="mt-1 text-xs text-ink-faint">Open to politicians, staff, journalists, researchers and the public. Submissions go to the review queue.</p>
              </div>
            </aside>
          </div>
        )}

        {tab === "claims" && (
          <div className="space-y-4">
            {claims.length === 0 ? (
              <EmptyState>No claims by {politician.fullName} have been checked and published yet.</EmptyState>
            ) : (
              claims.map((item) => <ClaimCard key={item.claim.id} item={item} detail={detailById.get(item.claim.id)} showPolitician={false} />)
            )}
          </div>
        )}

        {tab === "corrections" && (
          <div className="space-y-6">
            <div>
              <h2 className="label-caps mb-3 text-ink-faint">What happened after each checked claim</h2>
              {corrections.length === 0 ? (
                <EmptyState title="No correction records yet.">Correction behaviour is recorded once a claim has been checked. Motivation is never inferred.</EmptyState>
              ) : (
                <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
                  {corrections.map(({ correction, claim, source }) => (
                    <li key={correction.id} className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <CorrectionBadge status={correction.status} />
                        {correction.date && <span className="text-xs text-ink-muted">{formatDate(correction.date)}</span>}
                        <EvidenceBadge status={claim.assessment.status} size="sm" />
                      </div>
                      <Link href={`/claims/${claim.claim.id}`} className="mt-2 block font-serif text-lg leading-snug hover:underline">
                        “{claim.claim.quote}”
                      </Link>
                      <p className="mt-1.5 text-sm text-ink-muted">{correction.description}</p>
                      {source && (
                        <p className="mt-1 text-xs">
                          <SourceLink href={source.url}>{source.title}</SourceLink>
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h2 className="label-caps mb-3 text-ink-faint">Changes PUBLIC RECORD has made to this profile’s records</h2>
              {changeLog.length === 0 ? (
                <p className="text-sm text-ink-muted">No changes logged.</p>
              ) : (
                <ul className="divide-y divide-line rounded-lg border border-line bg-surface text-sm">
                  {changeLog.map((c) => (
                    <li key={c.id} className="p-3">
                      <span className="text-xs text-ink-muted">{formatDate(c.date)}</span> · {c.summary}
                      {c.previousValue && c.newValue && (
                        <span className="text-ink-muted">
                          {" "}
                          ({c.previousValue} → {c.newValue})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {tab === "integrity" && (
          <div className="space-y-4">
            {integrityMatters.length === 0 ? (
              <EmptyState>
                No verified integrity records have been added for {politician.fullName}. PUBLIC RECORD records integrity matters only from official bodies or substantial independent reporting, and never treats an allegation as a finding.
              </EmptyState>
            ) : (
              integrityMatters.map((m) => <IntegrityRecordCard key={m.matter.id} item={m} showPolitician={false} />)
            )}
          </div>
        )}

        {tab === "conduct" && (
          <div className="space-y-4">
            <p className="rounded border border-line bg-paper-deep/60 px-4 py-3 text-xs text-ink-muted">
              Serious conduct matters are entered only when supported by an official court, police or parliamentary record, or by substantial reporting from established news organisations. Rumours, anonymous accounts and social-media posts are never used. The legal status of each matter is displayed as prominently as the allegation.
            </p>
            {conductMatters.length === 0 ? (
              <EmptyState>No verified serious conduct records have been added for {politician.fullName}.</EmptyState>
            ) : (
              conductMatters.map((m) => <ConductRecordCard key={m.matter.id} item={m} showPolitician={false} />)
            )}
          </div>
        )}

        {tab === "sources" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-line bg-surface p-4">
              <h2 className="label-caps mb-2 text-ink-faint">Sources cited in this profile’s records</h2>
              <SourceList sources={sources} compact emptyText="No records published yet, so no evidence sources are attached." />
            </div>
            <div className="rounded-lg border border-line bg-surface p-4">
              <h2 className="label-caps mb-2 text-ink-faint">Sources used to verify this profile</h2>
              <SourceList sources={verificationSources} compact />
            </div>
          </div>
        )}
      </section>
    </Container>
  );
}
