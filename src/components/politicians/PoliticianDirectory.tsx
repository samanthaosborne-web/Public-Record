"use client";

import { useMemo, useState } from "react";
import type { Party, PartyId } from "@/lib/types";
import { PoliticianCard, type PoliticianCardData } from "./PoliticianCard";

export type PartyFilter = PartyId | "all";
type Sort = "alphabetical" | "position";

export function PoliticianDirectory({
  items,
  parties,
  initialParty = "all",
  initialSort = "alphabetical",
  showSort = true,
  showFilters = true,
}: {
  items: PoliticianCardData[];
  parties: Party[];
  initialParty?: PartyFilter;
  initialSort?: Sort;
  showSort?: boolean;
  showFilters?: boolean;
}) {
  const [party, setParty] = useState<PartyFilter>(initialParty);
  const [sort, setSort] = useState<Sort>(initialSort);

  const filterParties = parties.filter((p) => p.filterLabel);

  const visible = useMemo(() => {
    const list = items.filter((i) => party === "all" || i.politician.partyId === party);
    return list.sort((a, b) => {
      if (sort === "position" && a.politician.positionRank !== b.politician.positionRank) {
        return a.politician.positionRank - b.politician.positionRank;
      }
      return a.politician.sortName.localeCompare(b.politician.sortName);
    });
  }, [items, party, sort]);

  function choose(next: PartyFilter) {
    setParty(next);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (next === "all") url.searchParams.delete("party");
      else url.searchParams.set("party", next);
      window.history.replaceState(null, "", url.toString());
    }
  }

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
      active ? "border-ink bg-ink text-paper" : "border-line-strong bg-surface text-ink-muted hover:border-ink hover:text-ink"
    }`;

  return (
    <div>
      {(showFilters || showSort) && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          {showFilters && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by party">
              <button type="button" data-filter-party="all" className={chip(party === "all")} onClick={() => choose("all")} aria-pressed={party === "all"}>
                ALL
              </button>
              {filterParties.map((p) => (
                <button key={p.id} type="button" data-filter-party={p.id} className={chip(party === p.id)} onClick={() => choose(p.id)} aria-pressed={party === p.id}>
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ backgroundColor: p.accentColour }} aria-hidden="true" />
                  {p.filterLabel}
                </button>
              ))}
            </div>
          )}
          {showSort && (
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              Sort
              <select
                data-sort-select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="rounded border border-line-strong bg-surface px-2 py-1 text-xs text-ink"
              >
                <option value="alphabetical">Alphabetical</option>
                <option value="position">Parliamentary position</option>
              </select>
            </label>
          )}
        </div>
      )}
      {visible.length === 0 ? (
        <p className="rounded border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-muted">No profiles match this filter.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-directory>
          {visible.map((item) => (
            <li key={item.politician.id} data-party={item.politician.partyId} data-sort-name={item.politician.sortName} data-rank={item.politician.positionRank}>
              <PoliticianCard {...item} />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-ink-faint" data-directory-count>
        {visible.length} profile{visible.length === 1 ? "" : "s"}. Profiles are never ranked; default order is alphabetical.
      </p>
    </div>
  );
}
