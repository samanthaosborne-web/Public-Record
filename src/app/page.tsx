import Link from "next/link";
import { getRepository } from "@/lib/data";
import type { PartyId } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { one, type SearchParams } from "@/lib/params";
import { Container } from "@/components/ui/Container";
import { SearchBar } from "@/components/search/SearchBar";
import { StatTile } from "@/components/ui/StatTile";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PoliticianDirectory } from "@/components/politicians/PoliticianDirectory";
import { DailyUpdateFeed } from "@/components/feed/DailyUpdateFeed";
import { DemoNotice } from "@/components/ui/DemoBadge";

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const repo = await getRepository();
  const [parties, politicians, demoPoliticians, stats, demoStats, latestDate] = await Promise.all([
    repo.listParties(),
    repo.listPoliticians(),
    repo.listPoliticians({ demonstrationOnly: true }),
    repo.getSiteStats(),
    repo.getSiteStats({ includeDemonstration: true }),
    repo.latestUpdateDate(),
  ]);
  const partyById = new Map(parties.map((p) => [p.id, p]));
  const withStats = async (list: typeof politicians) =>
    Promise.all(list.map(async (politician) => ({ politician, party: partyById.get(politician.partyId)!, stats: await repo.getPoliticianStats(politician.id) })));
  const [items, demoItems, updates] = await Promise.all([
    withStats(politicians),
    withStats(demoPoliticians),
    latestDate ? repo.listDailyUpdates({ date: latestDate }) : Promise.resolve([]),
  ]);
  const partyParam = one(params.party);
  const initialParty = partyParam && partyById.has(partyParam as PartyId) ? (partyParam as PartyId) : "all";
  const noVerifiedRecords = stats.claimsChecked === 0 && stats.activeIntegrityMatters + stats.completedIntegrityMatters === 0;

  return (
    <>
      <section className="border-b border-line bg-surface">
        <Container className="py-12 sm:py-16">
          <p className="label-caps text-ink-faint">Australian federal political accountability and evidence platform</p>
          <h1 className="mt-3 font-semibold tracking-[0.16em] text-3xl sm:text-5xl">PUBLIC RECORD</h1>
          <p className="mt-3 font-serif text-2xl text-ink-muted sm:text-3xl">What they said. What the evidence shows.</p>
          <div className="mt-8 max-w-3xl">
            <SearchBar />
            <p className="mt-2 text-xs text-ink-faint">
              Try “housing”, “Medicare”, “inflation”, “Anthony Albanese”, “Angus Taylor” or an organisation such as “Auditor-General”.
            </p>
          </div>
        </Container>
      </section>

      <Container className="py-10">
        <SectionHeading title="Politicians" description="Verified profiles of federal parliamentarians. Filter by party. Profiles are never ranked." href="/politicians" linkLabel="Full directory" />
        <PoliticianDirectory items={items} parties={parties} initialParty={initialParty} />
      </Container>

      <section className="border-y border-line bg-surface/70">
        <Container className="py-10">
          <SectionHeading title="The record so far" description="Neutral totals across verified records. PUBLIC RECORD does not rank politicians or parties." />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Claims checked" value={stats.claimsChecked} muted={noVerifiedRecords} />
            <StatTile label="Claims supported" value={stats.claimsSupported} muted={noVerifiedRecords} />
            <StatTile label="Claims requiring context" value={stats.claimsRequiringContext} muted={noVerifiedRecords} />
            <StatTile label="Claims contradicted by evidence" value={stats.claimsContradicted} muted={noVerifiedRecords} />
            <StatTile label="Corrections recorded" value={stats.correctionsRecorded} muted={noVerifiedRecords} />
            <StatTile label="Active integrity matters" value={stats.activeIntegrityMatters} muted={noVerifiedRecords} />
            <StatTile label="Completed integrity matters" value={stats.completedIntegrityMatters} muted={noVerifiedRecords} />
            <StatTile label="Politicians profiled" value={stats.politiciansProfiled} note={`Verified ${formatDate("2026-09-30")}`} />
          </div>
          {noVerifiedRecords && (
            <p className="mt-3 text-xs text-ink-muted">
              No verified claim, integrity or conduct records have been published for real politicians yet. Candidate records enter the{" "}
              <Link href="/admin" className="underline underline-offset-4">
                review queue
              </Link>{" "}
              and are published only after human review. Demonstration records (fictional politicians) are excluded from these figures; they total{" "}
              {demoStats.claimsChecked} checked claims and {demoStats.activeIntegrityMatters + demoStats.completedIntegrityMatters} integrity matters.
            </p>
          )}
        </Container>
      </section>

      <Container className="py-10">
        <SectionHeading
          title="Today’s Record"
          eyebrow={latestDate ? `Latest update · ${formatDate(latestDate)}` : undefined}
          description="New and changed items discovered in the latest update. Each card links to the full record and its evidence."
          href="/today"
          linkLabel="All updates"
        />
        <DailyUpdateFeed items={updates} compact />
      </Container>

      <section className="border-t border-line">
        <Container className="py-10">
          <SectionHeading
            title="Demonstration profiles"
            description="Fictional politicians and fictional sources that show how PUBLIC RECORD presents claims, evidence, repeated claims, corrections, integrity matters and serious conduct matters. No real person is depicted."
          />
          <div className="mb-5">
            <DemoNotice />
          </div>
          <PoliticianDirectory items={demoItems} parties={parties} showFilters={false} showSort={false} />
        </Container>
      </section>

      <section className="border-t border-line bg-surface/70">
        <Container className="grid gap-8 py-12 md:grid-cols-2">
          <div>
            <p className="label-caps text-ink-faint">Principle</p>
            <h2 className="mt-2 font-serif text-2xl">Don’t trust PUBLIC RECORD. Check the evidence.</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              Every record carries a <span className="font-semibold text-ink">SHOW THE EVIDENCE</span> panel: the original statement, the original source, the primary evidence, independent evidence, contradictory evidence, context, the politician’s response and the date last checked. Links go directly to original documents. AI is used to locate, structure and explain evidence; it is never the final source, and nothing is published without human review.
            </p>
          </div>
          <div>
            <p className="label-caps text-ink-faint">Scope</p>
            <h2 className="mt-2 font-serif text-2xl">Claims, not character.</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              PUBLIC RECORD evaluates evidence relating to individual claims. It does not determine a person’s honesty, motivation or character. A claim contradicted by evidence is recorded as exactly that. Allegations are never treated as findings, and outcomes that clear a person are displayed with equal prominence.
            </p>
            <p className="mt-3 text-sm">
              <Link href="/methodology" className="text-accent underline underline-offset-4">
                How PUBLIC RECORD works →
              </Link>
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
