import type { Party } from "@/lib/types";

/** Party identifier: a small colour dot and the party name. Colour is an accent only. */
export function PartyTag({ party, full = false, className = "" }: { party: Party; full?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-ink-muted ${className}`}>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: party.accentColour }} aria-hidden="true" />
      <span>{full ? party.name : party.shortName}</span>
    </span>
  );
}
