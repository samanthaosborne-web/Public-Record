import Link from "next/link";
import type { DailyUpdateItem } from "@/lib/data/repository";
import { formatDate } from "@/lib/format";
import { UpdateTypeBadge } from "@/components/ui/StatusBadge";
import { PartyTag } from "@/components/ui/PartyTag";

export function DailyUpdateFeed({ items, compact = false }: { items: DailyUpdateItem[]; compact?: boolean }) {
  const verified = items.filter((i) => i.update.type === "profile_verified");
  const changes = items.filter((i) => i.update.type !== "profile_verified");

  if (items.length === 0) {
    return <p className="rounded border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-muted">No items recorded for this date.</p>;
  }

  return (
    <div className="space-y-4">
      {changes.length > 0 && (
        <ul className={`grid gap-3 ${compact ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
          {changes.map(({ update, politician, party, href }) => (
            <li key={update.id}>
              <Link href={href} className="flex h-full flex-col rounded-lg border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-strong">
                <div className="flex flex-wrap items-center gap-2">
                  <UpdateTypeBadge type={update.type} />
                  {politician?.isDemonstration && <span className="text-[0.6875rem] uppercase tracking-wide text-ink-faint">Demonstration</span>}
                </div>
                <h3 className="mt-2 text-sm font-semibold leading-snug text-ink">{update.title}</h3>
                <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-ink-muted">{update.summary}</p>
                <p className="mt-auto pt-3 text-xs text-ink-faint">
                  {politician && (
                    <>
                      {politician.fullName}
                      {party && (
                        <>
                          {" "}
                          · <PartyTag party={party} />
                        </>
                      )}
                      {" · "}
                    </>
                  )}
                  {formatDate(update.date)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {verified.length > 0 && (
        <details className="rounded-lg border border-line bg-surface">
          <summary className="cursor-pointer px-4 py-3 text-sm">
            <UpdateTypeBadge type="profile_verified" />{" "}
            <span className="ml-2 font-medium">{verified.length} politician profile{verified.length === 1 ? "" : "s"} verified against official records</span>
            <span className="ml-2 text-xs text-ink-faint">Show list</span>
          </summary>
          <ul className="grid gap-x-6 border-t border-line px-4 py-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {verified.map(({ update, politician, href }) => (
              <li key={update.id} className="flex min-w-0 items-baseline justify-between gap-2 border-b border-line py-1.5 last:border-b-0">
                <Link href={href} className="hover:underline">
                  {politician?.fullName ?? update.title}
                </Link>
                <span className="min-w-0 truncate text-xs text-ink-faint">{politician?.positionSummary}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
