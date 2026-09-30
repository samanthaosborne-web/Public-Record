import type { Correction, Source } from "@/lib/types";
import { CORRECTION_STATUS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { CorrectionBadge } from "@/components/ui/StatusBadge";
import { SourceLink } from "@/components/ui/SourceLink";

/** What happened after a claim was checked. Statuses describe observable behaviour only. */
export function CorrectionBehaviour({ corrections, sourcesById }: { corrections: Correction[]; sourcesById: Map<string, Source> }) {
  if (corrections.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface p-4 sm:p-5">
        <h3 className="label-caps text-ink-faint">Correction behaviour</h3>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          <CorrectionBadge status="no_correction_located" /> {CORRECTION_STATUS.no_correction_located.description}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-line bg-surface p-4 sm:p-5">
      <h3 className="label-caps text-ink-faint">Correction behaviour</h3>
      <ul className="mt-2 space-y-3">
        {corrections.map((c) => {
          const src = c.sourceId ? sourcesById.get(c.sourceId) : undefined;
          return (
            <li key={c.id} className="text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <CorrectionBadge status={c.status} />
                {c.date && <span className="text-xs text-ink-muted">{formatDate(c.date)}</span>}
              </div>
              <p className="mt-1.5 text-ink">{c.description}</p>
              {src && (
                <p className="mt-1 text-xs">
                  <SourceLink href={src.url}>{src.title}</SourceLink>
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
