import Link from "next/link";
import type { ClaimDetail } from "@/lib/data/repository";
import { formatDate } from "@/lib/format";
import { SourceLink } from "@/components/ui/SourceLink";
import { EvidenceBadge } from "@/components/ui/StatusBadge";

/** Shows when a claim was first made and each time it was repeated, and links repeated claims to the original check. */
export function RepetitionTimeline({ detail, sourcesById }: { detail: ClaimDetail; sourcesById: Map<string, { title: string; url: string }> }) {
  const { claim, repetitions, repeatsClaim, repeatedBy } = detail;
  if (repetitions.length === 0 && !repeatsClaim && repeatedBy.length === 0) return null;

  return (
    <div className="rounded-lg border border-line bg-surface p-4 sm:p-5">
      {repeatsClaim && (
        <div className="mb-4 rounded border border-status-amber/40 bg-status-amber-bg px-3 py-2 text-sm">
          <p className="label-caps text-status-amber">Repeated claim</p>
          <p className="mt-1 text-ink">
            This claim has previously been checked. It substantially repeats a statement by{" "}
            <Link href={`/politicians/${repeatsClaim.politician.slug}`} className="font-medium underline underline-offset-4">
              {repeatsClaim.politician.fullName}
            </Link>{" "}
            on {formatDate(repeatsClaim.claim.date)}:{" "}
            <Link href={`/claims/${repeatsClaim.claim.id}`} className="underline underline-offset-4">
              view the original record
            </Link>{" "}
            <EvidenceBadge status={repeatsClaim.assessment.status} size="sm" />.
          </p>
        </div>
      )}
      <h3 className="label-caps text-ink-faint">Timeline</h3>
      <ol className="mt-2 space-y-2 text-sm">
        <li className="flex flex-wrap items-baseline gap-x-3">
          <span className="w-36 shrink-0 font-semibold text-ink">Claim first made</span>
          <span className="text-ink">{formatDate(claim.date)}</span>
          <span className="text-ink-muted">{claim.context}</span>
        </li>
        {repetitions.map((r, i) => {
          const src = r.sourceId ? sourcesById.get(r.sourceId) : undefined;
          return (
            <li key={r.id} className="flex flex-wrap items-baseline gap-x-3">
              <span className="w-36 shrink-0 font-semibold text-ink">{i === 0 ? "Repeated" : ""}</span>
              <span className="text-ink">{formatDate(r.date)}</span>
              <span className="text-ink-muted">{r.context}</span>
              {r.reworded && <span className="text-xs text-ink-faint">(reworded)</span>}
              {r.evidenceChanged && <span className="text-xs text-status-amber">evidence had changed</span>}
              {src && (
                <SourceLink href={src.url} showHost={false} className="text-xs">
                  source
                </SourceLink>
              )}
            </li>
          );
        })}
        {repeatedBy.map((c) => (
          <li key={c.claim.id} className="flex flex-wrap items-baseline gap-x-3">
            <span className="w-36 shrink-0 font-semibold text-ink">Repeated by</span>
            <span className="text-ink">{formatDate(c.claim.date)}</span>
            <Link href={`/claims/${c.claim.id}`} className="text-ink-muted underline underline-offset-4">
              {c.politician.fullName} — {c.claim.context}
            </Link>
          </li>
        ))}
      </ol>
      {repetitions.length > 0 && (
        <p className="mt-3 text-xs text-ink-faint">
          The same claim was repeated on {repetitions.length} subsequent occasion{repetitions.length === 1 ? "" : "s"} after the original check
          {detail.assessments.length > 0 ? ` on ${formatDate(detail.assessments[detail.assessments.length - 1].reviewedAt)}` : ""}. PUBLIC RECORD does not infer motivation.
        </p>
      )}
    </div>
  );
}
