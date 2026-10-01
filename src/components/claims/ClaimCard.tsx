import Link from "next/link";
import type { ClaimDetail, ClaimListItem } from "@/lib/data/repository";
import { formatDate, truncate } from "@/lib/format";
import { EvidenceBadge, CorrectionBadge } from "@/components/ui/StatusBadge";
import { PartyTag } from "@/components/ui/PartyTag";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { DraftBadge } from "@/components/ui/DraftBadge";
import { EvidencePanel } from "./EvidencePanel";

export function ClaimCard({
  item,
  detail,
  showPolitician = true,
  headingLevel: Heading = "h3",
}: {
  item: ClaimListItem;
  /** When supplied, the SHOW THE EVIDENCE panel is embedded (collapsed). */
  detail?: ClaimDetail;
  showPolitician?: boolean;
  headingLevel?: "h2" | "h3";
}) {
  const { claim, assessment, politician, party, issues, repetitionCount, correctionStatus } = item;
  return (
    <article className="rounded-lg border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <EvidenceBadge status={assessment.status} />
        {claim.repeatsClaimId && <span className="rounded bg-status-amber-bg px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-status-amber">Repeated claim</span>}
        {repetitionCount > 0 && <span className="text-xs text-ink-muted">Repeated {repetitionCount} time{repetitionCount === 1 ? "" : "s"}</span>}
        {claim.isDemonstration && <DemoBadge />}
        {assessment.reviewedBy === "ai_draft" && <DraftBadge />}
      </div>

      <Heading className="mt-3 font-serif text-xl leading-snug text-ink">
        <Link href={`/claims/${claim.id}`} className="hover:underline hover:underline-offset-4">
          “{claim.quote}”
        </Link>
      </Heading>

      <p className="mt-2 text-xs text-ink-muted">
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
        <span>{formatDate(claim.date)}</span>
        <span className="mx-1.5 text-ink-faint">·</span>
        <span>{claim.context}</span>
      </p>

      <div className="mt-3 border-l-2 border-line-strong pl-3">
        <p className="label-caps text-ink-faint">What the evidence shows</p>
        <p className="mt-1 text-sm leading-relaxed text-ink">{truncate(assessment.findings, 280)}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {correctionStatus && (
          <span className="inline-flex items-center gap-1.5 text-ink-muted">
            Correction behaviour: <CorrectionBadge status={correctionStatus} size="sm" />
          </span>
        )}
        {issues.length > 0 && (
          <span className="inline-flex flex-wrap items-center gap-1.5 text-ink-muted">
            {issues.map((i) => (
              <Link key={i.id} href={`/issues/${i.slug}`} className="rounded bg-paper-deep px-1.5 py-0.5 hover:bg-line">
                {i.name}
              </Link>
            ))}
          </span>
        )}
        <span className="ml-auto text-ink-faint">Last reviewed {formatDate(assessment.reviewedAt)}</span>
      </div>

      <div className="mt-4">
        {detail ? (
          <EvidencePanel detail={detail} />
        ) : (
          <Link
            href={`/claims/${claim.id}#evidence`}
            className="inline-flex items-center gap-2 rounded border border-ink px-3 py-1.5 text-xs font-semibold tracking-wide text-ink hover:bg-ink hover:text-paper"
          >
            SHOW THE EVIDENCE →
          </Link>
        )}
      </div>
    </article>
  );
}
