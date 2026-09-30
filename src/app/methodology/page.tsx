import type { Metadata } from "next";
import Link from "next/link";
import { EVIDENCE_STATUS, EVIDENCE_STATUS_ORDER, CORRECTION_STATUS, INTEGRITY_STATUS_ORDER, CONDUCT_STATUS } from "@/lib/labels";
import type { ConductStatus, CorrectionStatus } from "@/lib/types";
import { Container } from "@/components/ui/Container";
import { EvidenceBadge, CorrectionBadge, IntegrityBadge, StatusBadge } from "@/components/ui/StatusBadge";
import { TierLegend } from "@/components/sources/SourceList";

export const metadata: Metadata = { title: "How PUBLIC RECORD works" };

const SECTIONS = [
  ["what-is-a-claim", "What counts as a claim"],
  ["what-is-not", "What doesn’t"],
  ["evidence", "How evidence is selected"],
  ["classifications", "How classifications work"],
  ["repeated", "Repeated claims"],
  ["corrections", "How corrections work"],
  ["allegations", "How allegations are handled"],
  ["disputes", "How disputes can be submitted"],
  ["updates", "How updates are made"],
  ["ai", "How AI is used, and where humans review it"],
  ["terminology", "Terminology"],
] as const;

export default function MethodologyPage() {
  return (
    <Container className="py-10">
      <div className="grid gap-10 lg:grid-cols-4">
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-20">
            <p className="label-caps text-ink-faint">On this page</p>
            <ol className="mt-2 space-y-1.5 text-sm">
              {SECTIONS.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} className="text-ink-muted hover:text-ink hover:underline">
                    {label}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </aside>

        <article className="prose-record max-w-3xl lg:col-span-3">
          <p className="label-caps text-ink-faint">Methodology</p>
          <h1 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">How PUBLIC RECORD works</h1>
          <p className="mt-4 rounded-lg border border-line bg-surface px-5 py-4 font-serif text-lg leading-snug">
            PUBLIC RECORD evaluates evidence relating to individual claims. It does not determine a person’s honesty, motivation or character.
          </p>
          <p>
            PUBLIC RECORD is a politically neutral, searchable record of what Australian federal politicians say, what the evidence shows, what they correct, and how integrity and conduct matters involving them progress. It does not tell users which politicians are good or bad or which party to vote for, and it does not rank anyone. Its central principle is simple: don’t ask users to trust PUBLIC RECORD — show them the evidence.
          </p>

          <h2 id="what-is-a-claim">What counts as a claim</h2>
          <p>
            A claim is a statement of fact made publicly by a federal politician that can, in principle, be checked against a record: a number, a trend, a date, a quantity, a comparison, or a description of what a document or dataset says. Examples include “household disposable income has fallen 8 per cent”, “we have delivered 40,000 homes” and “emissions have risen every year since 2022”.
          </p>
          <p>Each claim is stored as its own record with the verbatim quote, the speaker, the date, the location or context, the original source where the statement is recorded, the issues it relates to, and every assessment ever made of it.</p>

          <h2 id="what-is-not">What doesn’t</h2>
          <p>
            Opinions, values, predictions and slogans are not fact-checked. “Australians are worse off than ever” depends on the measure chosen and the comparison period; “this region will be the fastest-growing in the country within five years” cannot be tested today. Such statements are logged with the classification <EvidenceBadge status="not_checkable" size="sm" /> so the context is visible, but they are not counted as checked claims and are never marked supported or contradicted. Where a politician attaches a specific figure to an opinion, the figure is recorded and checked as a separate claim.
          </p>

          <h2 id="evidence">How evidence is selected</h2>
          <p>Evidence is prioritised in three tiers. A contested claim is never assessed on a single partisan source.</p>
          <TierLegend />
          <p className="mt-4">
            Every claim record separates the <strong>original source</strong> (where the statement was made), <strong>primary evidence</strong>, <strong>independent evidence</strong>, <strong>contradictory evidence</strong> and the <strong>politician’s response</strong>. Each source shows its tier and links directly to the original document. AI summaries are never presented as the ultimate source.
          </p>

          <h2 id="classifications">How classifications work</h2>
          <p>Claims are not forced into true or false. Checkable claims receive one of the following evidence statuses:</p>
          <ul className="!list-none !pl-0">
            {EVIDENCE_STATUS_ORDER.map((s) => (
              <li key={s} className="flex flex-wrap items-baseline gap-2">
                <EvidenceBadge status={s} size="sm" />
                <span>{EVIDENCE_STATUS[s].description}</span>
              </li>
            ))}
          </ul>
          <p>
            Dashboards may say “claims contradicted by evidence: 12”. They never convert that into a count of lies, because intent cannot be inferred from factual inaccuracy. There is no “lies” counter anywhere on PUBLIC RECORD.
          </p>
          <p>
            When the evidence changes — a revised data release, a new report, a court decision — the classification may change. The earlier assessment is never deleted; it remains on the record and the change is logged on the{" "}
            <Link href="/corrections">corrections page</Link>.
          </p>

          <h2 id="repeated">Repeated claims</h2>
          <p>
            PUBLIC RECORD detects when substantially the same factual claim is made again, by the same politician or a colleague. A repetition is recorded on the original claim with its date and context, and a repeated claim by another speaker links to the original check with the note “This claim has previously been checked”. If evidence has changed since the previous check, the evidence record is updated before the repetition is assessed. The record states how many times a claim was repeated after the original check. It does not say why.
          </p>

          <h2 id="corrections">How corrections work</h2>
          <p>Two different things are both called corrections.</p>
          <h3>Corrections by politicians</h3>
          <p>After a claim is checked, PUBLIC RECORD records what happened next, using observable statuses only:</p>
          <ul className="!list-none !pl-0">
            {(Object.keys(CORRECTION_STATUS) as CorrectionStatus[]).map((s) => (
              <li key={s} className="flex flex-wrap items-baseline gap-2">
                <CorrectionBadge status={s} size="sm" />
                <span>{CORRECTION_STATUS[s].description}</span>
              </li>
            ))}
          </ul>
          <p>Motivation is never inferred. The record says “the same claim was repeated on three subsequent occasions after the original fact check”; it does not say a politician “deliberately continued” anything. Readers draw their own conclusions.</p>
          <h3>Corrections by PUBLIC RECORD</h3>
          <p>
            Every material change PUBLIC RECORD makes to its own records — a changed classification, added evidence, a changed status, an amended profile — is written to a public <Link href="/corrections">corrections log</Link> with the previous value, the new value and the reason. Historical records are never silently rewritten.
          </p>

          <h2 id="allegations">How allegations are handled</h2>
          <h3>Integrity matters</h3>
          <p>Integrity and corruption matters are a separate record type with an exact lifecycle status. Nothing is simply labelled “corruption”. Statuses are:</p>
          <p className="flex flex-wrap gap-1.5">
            {INTEGRITY_STATUS_ORDER.map((s) => (
              <IntegrityBadge key={s} status={s} size="sm" />
            ))}
          </p>
          <p>
            Each record names the organisation involved, the date, the description, the exact status, primary and independent sources, the politician’s response, the outcome and the date last checked. Preferred sources are the National Anti-Corruption Commission, state integrity commissions, the Australian Federal Police, the Commonwealth Director of Public Prosecutions, the Australian Electoral Commission, parliamentary committees, courts, Royal Commissions, the Auditor-General and official government investigations. An allegation is never treated as a finding. When a person is cleared, or an investigation closes without a finding of wrongdoing, that outcome is displayed with equal prominence.
          </p>
          <h3>Serious conduct matters</h3>
          <p>Sexual assault and serious misconduct allegations have the strictest rules on the site. A matter may be entered only if supported by an official court, police or parliamentary record, or by substantial reporting from credible, established news organisations. Rumours are never scraped. Accusations originating solely from anonymous social-media accounts, forums, social platforms, blogs, gossip sites or unsourced AI output are never published. Every entry states exactly which of these it is:</p>
          <p className="flex flex-wrap gap-1.5">
            {(Object.keys(CONDUCT_STATUS) as ConductStatus[]).map((s) => (
              <StatusBadge key={s} label={CONDUCT_STATUS[s].label} tone={CONDUCT_STATUS[s].tone} size="sm" />
            ))}
          </p>
          <p>
            The allegation is always written as an attributed allegation — “X publicly alleged that Y…” — never as an established fact, and the current legal status (for example “ALLEGATION — NO FINDING OF GUILT”) is displayed at least as prominently as the allegation. The politician’s publicly reported response or denial is always shown where available. No serious matter is ever auto-published.
          </p>

          <h2 id="disputes">How disputes can be submitted</h2>
          <p>
            Every profile and every record carries a <Link href="/submit">Submit correction or additional evidence</Link> link. Politicians, staff, journalists, researchers and members of the public can use it. A submission never changes a record directly: it enters the review queue, where a reviewer assesses the evidence against the same standards used for every other entry. Politicians’ responses are attached to the record and displayed alongside the evidence.
          </p>

          <h2 id="updates">How updates are made</h2>
          <p>PUBLIC RECORD is designed around a daily update pipeline that monitors Hansard, the Parliament website, ministerial and party websites, media releases, press-conference transcripts, integrity bodies, courts, the AFP, the AEC, the ABS, the RBA, Treasury, the Auditor-General, reputable news outlets and established fact-checkers. The stages are:</p>
          <ol>
            <li>Source ingestion</li>
            <li>Transcription / text extraction</li>
            <li>Claim extraction</li>
            <li>Claim matching (has this been said and checked before?)</li>
            <li>Evidence retrieval</li>
            <li>Source quality checking</li>
            <li>Duplicate detection</li>
            <li>AI draft</li>
            <li>Human review</li>
            <li>Publish</li>
          </ol>
          <p>
            New and changed items appear in <Link href="/today">Today’s Record</Link>. The architecture is described in the repository documentation so that scheduled automation can be added without changing the site.
          </p>

          <h2 id="ai">How AI is used, and where humans review it</h2>
          <p>
            AI is used to locate, structure and explain evidence: to extract candidate claims from transcripts, to find matching records, to retrieve and tier sources, to flag risks and to draft a suggested classification with an explanation. Every AI draft enters the review queue with its sources, source quality, possible contradictory sources, similar historical claims and risk flags. A reviewer can approve, edit, reject, request more evidence or mark it duplicate. Nothing is published without that human decision. Serious criminal, corruption or sexual-misconduct allegations always carry a human-review flag and can never be auto-published. AI output is never the ultimate source: readers can follow every link to the original document.
          </p>

          <h2 id="terminology">Terminology</h2>
          <p>PUBLIC RECORD does not label politicians as liars, corrupt, criminal, sexual offenders or dishonest unless an applicable court or official body has made the relevant legal finding, and then only in words that accurately reflect that finding. It uses “claims checked” rather than a lies counter; it distinguishes allegation, investigation, charge, conviction and acquittal; and it never converts factual inaccuracy into a judgement about intent. There is no “most dishonest politician”, “worst party”, “best party”, truthfulness ranking or corruption ranking, and there never will be.</p>
        </article>
      </div>
    </Container>
  );
}
