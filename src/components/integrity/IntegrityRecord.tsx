import Link from "next/link";
import type { IntegrityMatterDetail, IntegrityMatterItem } from "@/lib/data/repository";
import { INTEGRITY_STATUS, INTEGRITY_STATUS_ORDER } from "@/lib/labels";
import { formatDate, truncate } from "@/lib/format";
import { IntegrityBadge, StatusBadge } from "@/components/ui/StatusBadge";
import { PartyTag } from "@/components/ui/PartyTag";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { DraftBadge } from "@/components/ui/DraftBadge";
import { SourceList } from "@/components/sources/SourceList";
import { SourceLink } from "@/components/ui/SourceLink";

function NotAFinding({ status }: { status: IntegrityMatterItem["matter"]["status"] }) {
  const meta = INTEGRITY_STATUS[status];
  if (meta.phase === "adverse_finding") return null;
  if (meta.phase === "no_adverse_finding") {
    return (
      <p className="rounded border border-status-green/40 bg-status-green-bg px-3 py-2 text-sm text-status-green">
        <span className="font-semibold uppercase tracking-wide">Outcome: {meta.label}.</span> {meta.description}
      </p>
    );
  }
  return (
    <p className="rounded border border-line bg-paper px-3 py-2 text-sm text-ink-muted">
      <span className="font-semibold uppercase tracking-wide text-ink">Not a finding.</span> {meta.description} An allegation, referral or investigation is not evidence of wrongdoing.
    </p>
  );
}

export function IntegrityRecordCard({ item, showPolitician = true }: { item: IntegrityMatterItem; showPolitician?: boolean }) {
  const { matter, politician, party } = item;
  return (
    <article className="rounded-lg border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <IntegrityBadge status={matter.status} prominent />
        {matter.isDemonstration && <DemoBadge />}
        {matter.reviewedBy === "ai_draft" && <DraftBadge />}
      </div>
      <h3 className="mt-2 font-serif text-xl leading-snug">
        <Link href={`/integrity/${matter.id}`} className="hover:underline hover:underline-offset-4">
          {matter.title}
        </Link>
      </h3>
      <p className="mt-1.5 text-xs text-ink-muted">
        {showPolitician && (
          <>
            <Link href={`/politicians/${politician.slug}`} className="font-medium text-ink hover:underline">
              {politician.fullName}
            </Link>
            <span className="mx-1.5 text-ink-faint">·</span>
            <PartyTag party={party} />
            <span className="mx-1.5 text-ink-faint">·</span>
          </>
        )}
        {formatDate(matter.date)} · {matter.organisation}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-ink">{truncate(matter.description, 260)}</p>
      {matter.outcome && (
        <p className="mt-2 text-sm">
          <span className="font-semibold">Outcome:</span> {truncate(matter.outcome, 200)}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-faint">
        <span>Last checked {formatDate(matter.lastCheckedAt)}</span>
        <Link href={`/integrity/${matter.id}`} className="font-semibold tracking-wide text-ink hover:underline">
          SHOW THE EVIDENCE →
        </Link>
      </div>
    </article>
  );
}

export function StatusLifecycle<T extends string>({
  history,
  labels,
}: {
  history: { status: T; date: string; note?: string; sourceId?: string }[];
  labels: Record<T, { label: string; tone: import("@/lib/labels").Tone }>;
}) {
  return (
    <ol className="relative ml-2 border-l border-line-strong pl-5">
      {history.map((h, i) => (
        <li key={`${h.status}-${h.date}`} className="relative pb-4 last:pb-0">
          <span className={`absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full ${i === history.length - 1 ? "bg-ink" : "bg-line-strong"}`} aria-hidden="true" />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={labels[h.status].label} tone={labels[h.status].tone} size="sm" prominent />
            <span className="text-xs text-ink-muted">{formatDate(h.date)}</span>
            {i === history.length - 1 && <span className="text-xs text-ink-faint">current</span>}
          </div>
          {h.note && <p className="mt-1 text-sm text-ink-muted">{h.note}</p>}
        </li>
      ))}
    </ol>
  );
}

export function IntegrityRecordDetail({ detail }: { detail: IntegrityMatterDetail }) {
  const { matter, primarySources, independentSources, response, responseSource } = detail;
  const lifecycleLabels = Object.fromEntries(INTEGRITY_STATUS_ORDER.map((s) => [s, INTEGRITY_STATUS[s]])) as typeof INTEGRITY_STATUS;
  return (
    <div className="space-y-6">
      <NotAFinding status={matter.status} />

      <section className="rounded-lg border border-line bg-surface p-4 sm:p-5">
        <h2 className="label-caps text-ink-faint">Description</h2>
        <p className="mt-2 text-sm leading-relaxed">{matter.description}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="label-caps text-ink-faint">Organisation involved</dt>
            <dd className="mt-1">{matter.organisation}</dd>
          </div>
          <div>
            <dt className="label-caps text-ink-faint">Date</dt>
            <dd className="mt-1">{formatDate(matter.date)}</dd>
          </div>
          <div>
            <dt className="label-caps text-ink-faint">Exact status</dt>
            <dd className="mt-1">
              <IntegrityBadge status={matter.status} prominent />
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-line bg-surface p-4 sm:p-5">
        <h2 className="label-caps mb-3 text-ink-faint">Status history</h2>
        <StatusLifecycle history={matter.statusHistory} labels={lifecycleLabels} />
      </section>

      {matter.outcome && (
        <section className="rounded-lg border border-line bg-surface p-4 sm:p-5">
          <h2 className="label-caps text-ink-faint">Outcome</h2>
          <p className="mt-2 text-sm leading-relaxed">{matter.outcome}</p>
        </section>
      )}

      <section className="rounded-lg border border-line bg-surface p-4 sm:p-5">
        <h2 className="label-caps text-ink-faint">Primary sources</h2>
        <SourceList sources={primarySources} compact emptyText="No primary source attached." />
        <h2 className="label-caps mt-5 text-ink-faint">Independent sources</h2>
        <SourceList sources={independentSources} compact emptyText="No independent source attached." />
      </section>

      <section className="rounded-lg border border-line bg-surface p-4 sm:p-5">
        <h2 className="label-caps text-ink-faint">Politician’s response</h2>
        {response ? (
          <div className="mt-2 text-sm">
            <p className="text-xs text-ink-muted">
              {formatDate(response.date)} · {response.kind.replace(/_/g, " ")}
            </p>
            <p className="mt-1">{response.summary}</p>
            {response.quote && <blockquote className="mt-2 border-l-2 border-line-strong pl-3 font-serif text-base text-ink-muted">“{response.quote}”</blockquote>}
            {responseSource && (
              <p className="mt-2 text-xs">
                <SourceLink href={responseSource.url}>{responseSource.title}</SourceLink>
              </p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-faint">No response located.</p>
        )}
      </section>

      <p className="text-xs text-ink-faint">
        Date last checked: {formatDate(matter.lastCheckedAt)} ·{" "}
        {matter.reviewedBy === "human" && matter.humanReviewedAt ? `Publication approved by a human reviewer on ${formatDate(matter.humanReviewedAt)}` : "Drafted by AI from the official records cited above; awaiting editorial sign-off"} ·{" "}
        <Link href={`/submit?type=integrity&id=${matter.id}`} className="underline underline-offset-4">
          Submit correction or additional evidence
        </Link>
      </p>
    </div>
  );
}
