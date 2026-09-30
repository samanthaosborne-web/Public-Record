import type { Metadata } from "next";
import Link from "next/link";
import { getRepository } from "@/lib/data";
import { UPDATE_TYPE } from "@/lib/labels";
import type { DailyUpdateType } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { one, type SearchParams } from "@/lib/params";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { DailyUpdateFeed } from "@/components/feed/DailyUpdateFeed";
import { UpdateTypeBadge } from "@/components/ui/StatusBadge";

export const metadata: Metadata = { title: "Today’s Record" };

export default async function TodayPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const repo = await getRepository();
  const dates = await repo.listUpdateDates();
  const requested = one(sp.date);
  const date = requested && dates.includes(requested) ? requested : dates[0];
  const items = date ? await repo.listDailyUpdates({ date }) : [];
  const byType = (Object.keys(UPDATE_TYPE) as DailyUpdateType[]).map((t) => ({ type: t, count: items.filter((i) => i.update.type === t).length })).filter((x) => x.count > 0);

  return (
    <Container className="py-10">
      <SectionHeading
        as="h1"
        title="Today’s Record"
        eyebrow={date ? `Update of ${formatDate(date)}` : undefined}
        description="What changed in the latest update: new claims, updated claims, corrections, investigations opened or closed, official findings, court updates and repeated claims. The daily pipeline drafts items; a person reviews every item before it appears here."
      />

      <div className="flex flex-col gap-4 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <p className="label-caps mb-2 text-ink-faint">Update dates</p>
          <ul className="flex flex-wrap gap-1.5 lg:flex-col">
            {dates.map((d) => (
              <li key={d}>
                <Link
                  href={`/today?date=${d}`}
                  aria-current={d === date ? "page" : undefined}
                  className={`block rounded px-2.5 py-1.5 text-sm ${d === date ? "bg-ink text-paper" : "bg-surface text-ink-muted hover:bg-paper-deep hover:text-ink"}`}
                >
                  {formatDate(d)}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
        <div className="min-w-0 flex-1">
          {byType.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {byType.map(({ type, count }) => (
                <span key={type} className="inline-flex items-center gap-1.5">
                  <UpdateTypeBadge type={type} />
                  <span className="font-mono text-xs text-ink-faint">{count}</span>
                </span>
              ))}
            </div>
          )}
          <DailyUpdateFeed items={items} />
        </div>
      </div>
    </Container>
  );
}
