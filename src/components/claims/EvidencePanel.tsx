import type { ClaimDetail } from "@/lib/data/repository";
import { EVIDENCE_STATUS } from "@/lib/labels";
import { formatDate, formatDateWithPrecision } from "@/lib/format";
import { SourceList } from "@/components/sources/SourceList";
import { SourceLink } from "@/components/ui/SourceLink";
import { EvidenceBadge, CorrectionBadge } from "@/components/ui/StatusBadge";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-4 first:border-t-0">
      <h4 className="label-caps mb-2 text-ink-faint">{title}</h4>
      <div className="text-sm text-ink">{children}</div>
    </section>
  );
}

/** Empty-state copy for the contradictory-evidence section, which depends on how the claim was assessed. */
function contradictoryEmptyText(status: keyof typeof EVIDENCE_STATUS) {
  if (status === "contradicted") return "The primary evidence listed above is inconsistent with the claim as stated; no separate contradicting source is attached.";
  if (status === "mixed" || status === "mostly_supported") return "The primary evidence listed above supplies the context the claim needs; no separate contradicting source is attached.";
  return "No evidence located that contradicts the claim.";
}

/**
 * SHOW THE EVIDENCE.
 * Rendered as a native <details> element so it works without JavaScript and
 * is fully keyboard accessible. Every section links to original documents;
 * PUBLIC RECORD's summaries are never the final source.
 */
export function EvidencePanel({ detail, defaultOpen = false, id }: { detail: ClaimDetail; defaultOpen?: boolean; id?: string }) {
  const { claim, assessment, sources, originalSource, responses, corrections, assessments } = detail;
  const primary = sources.filter((s) => s.role === "primary");
  const independent = sources.filter((s) => s.role === "independent" || s.role === "supporting");
  const contradictory = sources.filter((s) => s.role === "contradictory");
  const responseSources = sources.filter((s) => s.role === "response");

  return (
    <details id={id} className="evidence group rounded-lg border border-line bg-surface" open={defaultOpen}>
      <summary className="flex items-center justify-between gap-3 px-4 py-3 text-sm font-semibold tracking-wide text-ink">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded-sm border border-ink/60 text-center text-[10px] leading-[14px] group-open:bg-ink group-open:text-paper" aria-hidden="true">
            ≡
          </span>
          SHOW THE EVIDENCE
        </span>
        <span className="text-xs font-normal text-ink-faint group-open:hidden">Original statement · sources · context · response</span>
        <span className="hidden text-xs font-normal text-ink-faint group-open:inline">Hide</span>
      </summary>
      <div className="border-t border-line px-4 pb-2">
        <Section title="Original statement">
          <blockquote className="font-serif text-lg leading-snug text-ink">“{claim.quote}”</blockquote>
          <p className="mt-2 text-xs text-ink-muted">
            {formatDateWithPrecision(claim.date, claim.datePrecision)} · {claim.context}
          </p>
        </Section>

        <Section title="Original source">
          {originalSource ? (
            <SourceList sources={[originalSource]} compact />
          ) : (
            <p className="text-ink-faint">Original source not recorded.</p>
          )}
        </Section>

        <Section title="Evidence status">
          <div className="flex flex-wrap items-center gap-2">
            <EvidenceBadge status={assessment.status} size="lg" />
            <span className="text-xs text-ink-muted">{EVIDENCE_STATUS[assessment.status].description}</span>
          </div>
          <p className="mt-3 leading-relaxed">{assessment.findings}</p>
        </Section>

        <Section title="Primary evidence">
          <SourceList sources={primary} compact emptyText="No Tier 1 source located. See the evidence status above." />
        </Section>

        <Section title="Independent evidence">
          <SourceList sources={independent} compact emptyText="No independent source attached." />
        </Section>

        <Section title="Contradictory evidence">
          {contradictory.length > 0 ? (
            <SourceList sources={contradictory} compact />
          ) : (
            <p className="text-ink-faint">{contradictoryEmptyText(assessment.status)}</p>
          )}
        </Section>

        <Section title="Context">
          {assessment.context ? <p className="leading-relaxed">{assessment.context}</p> : <p className="text-ink-faint">No additional context recorded.</p>}
        </Section>

        <Section title="Politician response">
          {responses.length === 0 && corrections.length === 0 ? (
            <p className="text-ink-faint">No response located.</p>
          ) : (
            <ul className="space-y-3">
              {responses.map((r) => (
                <li key={r.id}>
                  <p className="text-xs text-ink-muted">
                    {formatDate(r.date)} · {r.kind.replace(/_/g, " ")}
                  </p>
                  <p>{r.summary}</p>
                  {r.quote && <blockquote className="mt-1 border-l-2 border-line-strong pl-3 font-serif text-base text-ink-muted">“{r.quote}”</blockquote>}
                </li>
              ))}
              {corrections.map((c) => (
                <li key={c.id} className="flex flex-wrap items-start gap-2">
                  <CorrectionBadge status={c.status} />
                  <span className="text-ink-muted">{c.description}</span>
                </li>
              ))}
            </ul>
          )}
          {responseSources.length > 0 && (
            <div className="mt-3">
              <SourceList sources={responseSources} compact />
            </div>
          )}
        </Section>

        {assessments.length > 1 && (
          <Section title="Assessment history">
            <ul className="space-y-2">
              {assessments.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-ink-faint">v{a.version}</span>
                  <EvidenceBadge status={a.status} size="sm" />
                  <span className="text-ink-muted">reviewed {formatDate(a.reviewedAt)}</span>
                  {a.id === assessment.id && <span className="text-ink-faint">(current)</span>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Last checked">
          <p>
            {formatDate(assessment.reviewedAt)} · reviewed by {assessment.reviewedBy === "human" ? "a human reviewer" : "AI draft, pending human review"}
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            <SourceLink href={`/submit?type=claim&id=${claim.id}`} showHost={false}>
              Submit a correction or additional evidence
            </SourceLink>
          </p>
        </Section>
      </div>
    </details>
  );
}
