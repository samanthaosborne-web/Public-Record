import Link from "next/link";
import type { Politician, ReviewQueueItem } from "@/lib/types";
import { REVIEW_KIND } from "@/lib/labels";
import { formatDateTime, truncate } from "@/lib/format";
import { ReviewStatusBadge, RiskFlagBadge } from "@/components/ui/StatusBadge";

export function ReviewQueue({ items, politicians }: { items: ReviewQueueItem[]; politicians: Map<string, Politician> }) {
  if (items.length === 0) {
    return <p className="rounded border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-muted">The queue is empty.</p>;
  }
  return (
    <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
      {items.map((item) => {
        const politician = item.politicianId ? politicians.get(item.politicianId) : undefined;
        const serious = item.targetType === "integrity" || item.targetType === "conduct";
        return (
          <li key={item.id} className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <ReviewStatusBadge status={item.status} size="sm" />
              <span className="text-xs text-ink-muted">{REVIEW_KIND[item.kind]}</span>
              <span className="text-xs text-ink-faint">· target: {item.targetType}</span>
              {serious && <span className="rounded bg-status-red-bg px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-status-red">Human review required</span>}
              <span className="ml-auto font-mono text-xs text-ink-faint">{item.id}</span>
            </div>
            <Link href={`/admin/review/${item.id}`} className="mt-2 block font-medium text-ink hover:underline">
              {truncate(item.claimText, 160)}
            </Link>
            <p className="mt-1 text-xs text-ink-muted">
              {politician ? `${politician.fullName} · ` : ""}
              submitted {formatDateTime(item.submittedAt)} by {item.submittedBy}
            </p>
            {item.riskFlags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.riskFlags.map((f) => (
                  <RiskFlagBadge key={f} flag={f} />
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
