import Link from "next/link";
import type { Politician, ReviewQueueItem } from "@/lib/types";
import type { ClaimListItem } from "@/lib/data/repository";
import { CONDUCT_STATUS, EVIDENCE_STATUS, INTEGRITY_STATUS, REVIEW_KIND, RISK_FLAG } from "@/lib/labels";
import { formatDate, formatDateTime } from "@/lib/format";
import { EvidenceBadge, ReviewStatusBadge, RiskFlagBadge, StatusBadge, TierBadge } from "@/components/ui/StatusBadge";
import { SourceLink } from "@/components/ui/SourceLink";
import { reviewDecision } from "@/app/admin/actions";

function suggestedLabel(item: ReviewQueueItem) {
  const s = item.suggestedStatus;
  if (!s) return null;
  if (item.targetType === "claim" && s in EVIDENCE_STATUS) {
    const meta = EVIDENCE_STATUS[s as keyof typeof EVIDENCE_STATUS];
    return <StatusBadge label={meta.label} tone={meta.tone} size="lg" />;
  }
  if (item.targetType === "integrity" && s in INTEGRITY_STATUS) {
    const meta = INTEGRITY_STATUS[s as keyof typeof INTEGRITY_STATUS];
    return <StatusBadge label={meta.label} tone={meta.tone} size="lg" prominent />;
  }
  if (item.targetType === "conduct" && s in CONDUCT_STATUS) {
    const meta = CONDUCT_STATUS[s as keyof typeof CONDUCT_STATUS];
    return <StatusBadge label={meta.banner} tone={meta.tone} size="lg" prominent />;
  }
  return <span className="text-sm">{s}</span>;
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className="label-caps text-ink-faint">{title}</h2>
      <div className="mt-2 text-sm">{children}</div>
    </section>
  );
}

export function ReviewItemScreen({ item, politician, similar, error }: { item: ReviewQueueItem; politician?: Politician | null; similar: ClaimListItem[]; error?: string }) {
  const serious = item.targetType === "integrity" || item.targetType === "conduct";
  const decided = item.status !== "pending";
  const button = "rounded border px-3 py-2 text-xs font-semibold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Block title="Claim / statement">
          <p className="font-serif text-lg leading-snug">“{item.claimText}”</p>
          <p className="mt-2 text-xs text-ink-muted">
            {politician ? `${politician.fullName} · ` : ""}
            {REVIEW_KIND[item.kind]} · submitted {formatDateTime(item.submittedAt)} by {item.submittedBy} · target record type: {item.targetType}
            {item.targetId && (
              <>
                {" "}
                · relates to <span className="font-mono">{item.targetId}</span>
              </>
            )}
          </p>
        </Block>

        <Block title="Suggested classification">{suggestedLabel(item) ?? <span className="text-ink-faint">None suggested.</span>}</Block>

        <Block title="AI explanation">
          <p className="leading-relaxed">{item.aiExplanation}</p>
          <p className="mt-2 text-xs text-ink-faint">AI drafts locate and structure evidence. They are never published without human review, and are never the final source.</p>
        </Block>

        <Block title="Sources and source quality">
          {item.sources.length === 0 ? (
            <p className="text-ink-faint">No sources attached.</p>
          ) : (
            <ul className="divide-y divide-line">
              {item.sources.map((s, i) => (
                <li key={`${s.url}-${i}`} className="py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <TierBadge tier={s.tier} />
                    <span className="text-xs text-ink-muted">{s.publisher}</span>
                  </div>
                  <SourceLink href={s.url}>{s.title}</SourceLink>
                  <p className="text-xs text-ink-faint">{s.qualityNote}</p>
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block title="Possible contradictory sources">
          {item.contradictorySources.length === 0 ? (
            <p className="text-ink-faint">None located.</p>
          ) : (
            <ul className="divide-y divide-line">
              {item.contradictorySources.map((s, i) => (
                <li key={`${s.url}-${i}`} className="py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <TierBadge tier={s.tier} />
                    <span className="text-xs text-ink-muted">{s.publisher}</span>
                  </div>
                  <SourceLink href={s.url}>{s.title}</SourceLink>
                  <p className="text-xs text-ink-faint">{s.qualityNote}</p>
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block title="Similar historical claims">
          {similar.length === 0 ? (
            <p className="text-ink-faint">No similar claims found.</p>
          ) : (
            <ul className="space-y-2">
              {similar.map((c) => {
                const sim = item.similarClaims.find((s) => s.claimId === c.claim.id);
                return (
                  <li key={c.claim.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-ink-faint">{sim ? `${Math.round(sim.similarity * 100)}%` : ""}</span>
                    <EvidenceBadge status={c.assessment.status} size="sm" />
                    <Link href={`/claims/${c.claim.id}`} className="underline underline-offset-4">
                      “{c.claim.quote}”
                    </Link>
                    <span className="text-xs text-ink-muted">
                      {c.politician.fullName}, {formatDate(c.claim.date)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Block>
      </div>

      <div className="space-y-4">
        <Block title="Status">
          <ReviewStatusBadge status={item.status} size="lg" />
          {item.reviewedAt && <p className="mt-2 text-xs text-ink-muted">Decided {formatDateTime(item.reviewedAt)}</p>}
          {item.reviewerNotes && <p className="mt-2 rounded bg-paper px-2 py-1.5 text-xs">{item.reviewerNotes}</p>}
        </Block>

        <Block title="Risk flags">
          {item.riskFlags.length === 0 ? (
            <p className="text-ink-faint">No risk flags.</p>
          ) : (
            <ul className="space-y-2">
              {item.riskFlags.map((f) => (
                <li key={f}>
                  <RiskFlagBadge flag={f} />
                  <p className="mt-0.5 text-xs text-ink-muted">{RISK_FLAG[f].description}</p>
                </li>
              ))}
            </ul>
          )}
          {serious && (
            <p className="mt-3 rounded border border-status-red/40 bg-status-red-bg px-2 py-1.5 text-xs text-status-red">
              Serious matter. Cannot be auto-published. Approval requires a Tier 1 or Tier 2 source and a reviewer note.
            </p>
          )}
        </Block>

        <Block title="Reviewer decision">
          {error === "serious" && (
            <p className="mb-3 rounded border border-status-red/40 bg-status-red-bg px-2 py-1.5 text-xs text-status-red">
              Not approved: serious matters need at least one Tier 1 or Tier 2 source and a reviewer note of at least 10 characters.
            </p>
          )}
          <form action={reviewDecision} className="space-y-3">
            <input type="hidden" name="id" value={item.id} />
            <label className="block text-xs text-ink-muted">
              Reviewer notes
              <textarea name="notes" rows={4} defaultValue={item.reviewerNotes ?? ""} className="mt-1 w-full rounded border border-line-strong bg-paper px-2 py-1.5 text-sm text-ink" placeholder="Why this decision was made; what was edited; what evidence is missing." />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button name="decision" value="approve" disabled={decided} className={`${button} border-status-green bg-status-green-bg text-status-green hover:bg-status-green hover:text-white`}>
                Approve
              </button>
              <button name="decision" value="edit" disabled={decided} className={`${button} border-status-blue bg-status-blue-bg text-status-blue hover:bg-status-blue hover:text-white`}>
                Edit
              </button>
              <button name="decision" value="reject" disabled={decided} className={`${button} border-line-strong bg-paper text-ink hover:bg-ink hover:text-paper`}>
                Reject
              </button>
              <button name="decision" value="request_evidence" disabled={decided} className={`${button} border-status-amber bg-status-amber-bg text-status-amber hover:bg-status-amber hover:text-white`}>
                Request more evidence
              </button>
              <button name="decision" value="duplicate" disabled={decided} className={`${button} col-span-2 border-line-strong bg-paper text-ink-muted hover:bg-paper-deep`}>
                Mark duplicate
              </button>
            </div>
            {decided && <p className="text-xs text-ink-faint">This item has been decided. Decisions are kept on the record; reopening requires a new item.</p>}
          </form>
        </Block>
      </div>
    </div>
  );
}
