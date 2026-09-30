import type { Source } from "@/lib/types";
import type { AttachedSource } from "@/lib/data/repository";
import { SOURCE_KIND, SOURCE_TIER } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { SourceLink } from "@/components/ui/SourceLink";
import { TierBadge } from "@/components/ui/StatusBadge";

export function SourceRow({ source, note, compact = false }: { source: Source; note?: string; compact?: boolean }) {
  return (
    <li className={`flex flex-col gap-1 ${compact ? "py-2" : "py-3"} border-b border-line last:border-b-0`}>
      <div className="flex flex-wrap items-center gap-2">
        <TierBadge tier={source.tier} />
        <span className="text-xs text-ink-faint">{SOURCE_KIND[source.kind]}</span>
        {source.publishedAt && <span className="text-xs text-ink-faint">· {formatDate(source.publishedAt)}</span>}
      </div>
      <SourceLink href={source.url} className="text-sm">
        {source.title}
      </SourceLink>
      <p className="text-xs text-ink-muted">
        {source.publisher}
        {(note ?? source.note) && <span className="text-ink-faint"> — {note ?? source.note}</span>}
      </p>
    </li>
  );
}

/** Sources ordered by tier (primary first). Accepts plain sources or role-attached sources. */
export function SourceList({ sources, compact = false, emptyText = "No sources attached." }: { sources: (Source | AttachedSource)[]; compact?: boolean; emptyText?: string }) {
  const rows = sources.map((s) => ("source" in s ? { source: s.source, note: s.note } : { source: s, note: undefined }));
  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    const key = `${r.source.id}:${r.note ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (unique.length === 0) return <p className="text-sm text-ink-faint">{emptyText}</p>;
  return (
    <ul>
      {unique
        .sort((a, b) => a.source.tier - b.source.tier)
        .map((r, i) => (
          <SourceRow key={`${r.source.id}-${i}`} source={r.source} note={r.note} compact={compact} />
        ))}
    </ul>
  );
}

export function TierLegend() {
  return (
    <dl className="grid gap-3 text-xs text-ink-muted sm:grid-cols-3">
      {([1, 2, 3] as const).map((tier) => (
        <div key={tier} className="rounded border border-line bg-surface p-3">
          <dt className="mb-1">
            <TierBadge tier={tier} />
          </dt>
          <dd>{SOURCE_TIER[tier].description}</dd>
        </div>
      ))}
    </dl>
  );
}
