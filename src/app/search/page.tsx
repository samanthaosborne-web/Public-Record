import type { Metadata } from "next";
import Link from "next/link";
import { getRepository } from "@/lib/data";
import { one, type SearchParams } from "@/lib/params";
import { Container } from "@/components/ui/Container";
import { SearchBar } from "@/components/search/SearchBar";
import { ClaimCard } from "@/components/claims/ClaimCard";
import { IntegrityRecordCard } from "@/components/integrity/IntegrityRecord";
import { ConductRecordCard } from "@/components/conduct/ConductRecord";
import { PoliticianCard } from "@/components/politicians/PoliticianCard";

export const metadata: Metadata = { title: "Search" };

const EXAMPLES = ["immigration", "housing", "inflation", "Anthony Albanese", "Angus Taylor", "Auditor-General", "Medicare", "climate"];

function Group({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="label-caps mb-3 flex items-center gap-2 text-ink-faint">
        {title} <span className="font-mono text-ink-muted">{count}</span>
      </h2>
      {children}
    </section>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = (one(sp.q) ?? "").trim();
  const repo = await getRepository();
  const results = q ? await repo.search(q) : null;
  const parties = await repo.listParties();
  const partyById = new Map(parties.map((p) => [p.id, p]));
  const politicianCards = results
    ? await Promise.all(results.politicians.map(async (politician) => ({ politician, party: partyById.get(politician.partyId)!, stats: await repo.getPoliticianStats(politician.id) })))
    : [];

  return (
    <Container className="py-10">
      <h1 className="font-serif text-3xl">Search</h1>
      <p className="mt-1 text-sm text-ink-muted">Search politicians, parties, topics, claims, organisations, dates and keywords. Results are grouped so claims, integrity matters and serious conduct matters are never mixed.</p>
      <div className="mt-5 max-w-3xl">
        <SearchBar defaultValue={q} autoFocus={!q} />
      </div>
      {!q && (
        <p data-search-examples className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
          Try:
          {EXAMPLES.map((e) => (
            <Link key={e} href={`/search?q=${encodeURIComponent(e)}`} className="rounded bg-surface px-2 py-0.5 ring-1 ring-line hover:ring-ink">
              {e}
            </Link>
          ))}
        </p>
      )}

      <div data-search-results>
      {results && (
        <>
          <p className="mt-6 text-sm text-ink-muted">
            {results.total === 0 ? "No results" : `${results.total} result${results.total === 1 ? "" : "s"}`} for “{results.query}”.
          </p>
          <Group title="Politicians" count={results.politicians.length}>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {politicianCards.map((c) => (
                <li key={c.politician.id}>
                  <PoliticianCard {...c} />
                </li>
              ))}
            </ul>
          </Group>
          <Group title="Issues" count={results.issues.length}>
            <ul className="flex flex-wrap gap-2">
              {results.issues.map((i) => (
                <li key={i.id}>
                  <Link href={`/issues/${i.slug}`} className="rounded-full border border-line-strong bg-surface px-3 py-1 text-sm hover:border-ink">
                    {i.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Group>
          <Group title="Claims" count={results.claims.length}>
            <ul className="space-y-4">
              {results.claims.map((c) => (
                <li key={c.claim.id}>
                  <ClaimCard item={c} />
                </li>
              ))}
            </ul>
          </Group>
          <Group title="Integrity matters" count={results.integrityMatters.length}>
            <ul className="space-y-4">
              {results.integrityMatters.map((m) => (
                <li key={m.matter.id}>
                  <IntegrityRecordCard item={m} />
                </li>
              ))}
            </ul>
          </Group>
          <Group title="Serious conduct matters" count={results.conductMatters.length}>
            <ul className="space-y-4">
              {results.conductMatters.map((m) => (
                <li key={m.matter.id}>
                  <ConductRecordCard item={m} />
                </li>
              ))}
            </ul>
          </Group>
        </>
      )}
      </div>
    </Container>
  );
}
