import Link from "next/link";
import type { Party, Politician, PoliticianStats } from "@/lib/types";
import { PoliticianAvatar } from "./PoliticianAvatar";
import { PartyTag } from "@/components/ui/PartyTag";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { formatNumber } from "@/lib/format";

export interface PoliticianCardData {
  politician: Politician;
  party: Party;
  stats: PoliticianStats;
}

function Count({ label, value, emphasis = false }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="text-ink-muted">{label}</span>
      <span className={`font-mono tabular-nums ${emphasis && value > 0 ? "text-ink" : "text-ink-muted"}`}>{formatNumber(value)}</span>
    </div>
  );
}

export function PoliticianCard({ politician, party, stats }: PoliticianCardData) {
  const seat = politician.chamber === "house" ? `${politician.electorate}, ${politician.state}` : `Senator for ${politician.state === "ACT" ? "the ACT" : politician.state === "NT" ? "the NT" : politician.state}`;
  return (
    <Link
      href={`/politicians/${politician.slug}`}
      className="group flex h-full flex-col rounded-lg border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-strong"
    >
      <div className="flex items-start gap-3">
        <PoliticianAvatar name={politician.fullName} photoUrl={politician.photoUrl} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-ink group-hover:underline group-hover:underline-offset-4">{politician.fullName}</h3>
          <PartyTag party={party} className="mt-0.5" />
          <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{politician.positionSummary}</p>
          <p className="mt-0.5 text-xs text-ink-faint">{seat}</p>
        </div>
      </div>
      {politician.isDemonstration && <DemoBadge className="mt-3 self-start" />}
      <div className="mt-4 space-y-1 border-t border-line pt-3">
        <Count label="Claims checked" value={stats.claimsChecked} emphasis />
        <Count label="Contradicted by evidence" value={stats.claimsContradicted} />
        <Count label="Corrections / clarifications" value={stats.corrections} />
        <Count label="Integrity matters" value={stats.integrityMatters} />
        <Count label="Serious conduct matters" value={stats.conductMatters} />
      </div>
    </Link>
  );
}
