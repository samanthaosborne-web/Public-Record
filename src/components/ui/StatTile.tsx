import { formatNumber } from "@/lib/format";

export function StatTile({ label, value, note, muted = false }: { label: string; value: number; note?: string; muted?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-3 shadow-card">
      <p className="label-caps text-ink-faint">{label}</p>
      <p className={`mt-1 font-serif text-3xl leading-none ${muted ? "text-ink-faint" : "text-ink"}`}>{formatNumber(value)}</p>
      {note && <p className="mt-1.5 text-xs text-ink-faint">{note}</p>}
    </div>
  );
}

export function StatInline({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-1.5 text-sm last:border-b-0">
      <span className="text-ink-muted">{label}</span>
      <span className="font-mono tabular-nums text-ink">{formatNumber(value)}</span>
    </div>
  );
}
