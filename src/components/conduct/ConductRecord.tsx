import Link from "next/link";
import type { ConductMatterDetail, ConductMatterItem } from "@/lib/data/repository";
import { CONDUCT_STATUS } from "@/lib/labels";
import { formatDate, truncate } from "@/lib/format";
import { TONE } from "@/components/ui/StatusBadge";
import { PartyTag } from "@/components/ui/PartyTag";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { SourceList } from "@/components/sources/SourceList";
import { SourceLink } from "@/components/ui/SourceLink";
import { StatusLifecycle } from "@/components/integrity/IntegrityRecord";

/** The current status is displayed at least as prominently as the allegation. */
export function ConductStatusBanner({ status, size = "lg" }: { status: ConductMatterItem["matter"]["status"]; size?: "md" | "lg" }) {
  const meta = CONDUCT_STATUS[status];
  const t = TONE[meta.tone];
  return (
    <div className={`rounded border ${t.ring} ${t.badge} ${size === "lg" ? "px-4 py-3" : "px-3 py-2"}`}>
      <p className="label-caps opacity-80">Current status</p>
      <p className={`mt-0.5 font-semibold uppercase tracking-wide ${size === "lg" ? "text-base sm:text-lg" : "text-sm"}`}>{meta.banner}</p>
      <p className="mt-1 text-xs opacity-90">{meta.description}</p>
    </div>
  );
}

export function ConductRecordCard({ item, showPolitician = true }: { item: ConductMatterItem; showPolitician?: boolean }) {
  const { matter, politician, party } = item;
  return (
    <article className="rounded-lg border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="label-caps text-ink-faint">Serious conduct matter</span>
        {matter.isDemonstration && <DemoBadge />}
      </div>
      <h3 className="mt-2 font-serif text-xl leading-snug">
        <Link href={`/conduct/${matter.id}`} className="hover:underline hover:underline-offset-4">
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
        {formatDate(matter.date)}
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="label-caps text-ink-faint">What was alleged</p>
          <p className="mt-1 text-sm leading-relaxed">{truncate(matter.allegationSummary, 240)}</p>
        </div>
        <ConductStatusBanner status={matter.status} size="md" />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-faint">
        <span>Last checked {formatDate(matter.lastCheckedAt)}</span>
        <Link href={`/conduct/${matter.id}`} className="font-semibold tracking-wide text-ink hover:underline">
          SHOW THE EVIDENCE →
        </Link>
      </div>
    </article>
  );
}

export function ConductRecordDetail({ detail }: { detail: ConductMatterDetail }) {
  const { matter, primarySources, independentSources, response, responseSource } = detail;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-line bg-surface p-4 sm:p-5">
          <h2 className="label-caps text-ink-faint">What was alleged</h2>
          <p className="mt-2 text-sm leading-relaxed">{matter.allegationSummary}</p>
          <p className="mt-3 text-xs text-ink-faint">
            Evidence basis: {matter.evidenceBasis === "official_record" ? "official court, police or parliamentary record" : "substantial reporting by established news organisations"}.
          </p>
        </section>
        <ConductStatusBanner status={matter.status} />
      </div>

      <section className="rounded-lg border border-line bg-surface p-4 sm:p-5">
        <h2 className="label-caps mb-3 text-ink-faint">Status history</h2>
        <StatusLifecycle history={matter.statusHistory} labels={CONDUCT_STATUS} />
      </section>

      {matter.outcome && (
        <section className="rounded-lg border border-status-green/40 bg-status-green-bg p-4 sm:p-5">
          <h2 className="label-caps text-status-green">Outcome</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink">{matter.outcome}</p>
        </section>
      )}

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
          <p className="mt-2 text-sm text-ink-faint">No public response located. PUBLIC RECORD will add one if it is published.</p>
        )}
      </section>

      <section className="rounded-lg border border-line bg-surface p-4 sm:p-5">
        <h2 className="label-caps text-ink-faint">Primary sources</h2>
        <SourceList sources={primarySources} compact emptyText="No primary source attached." />
        <h2 className="label-caps mt-5 text-ink-faint">Independent sources</h2>
        <SourceList sources={independentSources} compact emptyText="No independent source attached." />
      </section>

      <p className="text-xs text-ink-faint">
        Date last checked: {formatDate(matter.lastCheckedAt)} · Publication approved by a human reviewer on {formatDate(matter.humanReviewedAt)} ·{" "}
        <Link href={`/submit?type=conduct&id=${matter.id}`} className="underline underline-offset-4">
          Submit correction or additional evidence
        </Link>
      </p>
    </div>
  );
}
