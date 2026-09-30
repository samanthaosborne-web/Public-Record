/**
 * Mock stage implementations.
 *
 * They run entirely offline against the bundled JSON database so the whole
 * pipeline can be exercised end-to-end (npm run pipeline:dry-run) before any
 * fetcher, transcription service, LLM or database is connected. Each mock
 * documents the real behaviour it stands in for.
 */
import { getRepository } from "@/lib/data";
import type { CandidateSource, RiskFlag } from "@/lib/types";
import type {
  CandidateClaim,
  ClaimMatch,
  Draft,
  DuplicateDecision,
  EvidenceBundle,
  ExtractedText,
  GateDecision,
  IngestedDocument,
  MonitoredSource,
  PipelineContext,
  PipelineStages,
  QualityReport,
} from "../types";

const REPETITION_THRESHOLD = 0.85;
const SERIOUS_PATTERNS = /\b(assault|harass|sexual|misconduct|corrupt|bribe|fraud|kickback|charged|arrest)/i;

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
}

/** Jaccard similarity over word sets. A real system uses embeddings plus numeric-entity matching. */
export function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  return inter / (ta.size + tb.size - inter);
}

export const mockStages: PipelineStages = {
  /** Real: poll feeds/APIs for documents newer than the last run; store raw payloads in object storage. */
  async ingest(sources: MonitoredSource[], ctx: PipelineContext): Promise<IngestedDocument[]> {
    ctx.log(`ingest: ${sources.length} monitored sources (mock: returning a fixed transcript)`);
    return [
      {
        id: `doc_${ctx.runDate}-001`,
        monitoredSourceId: "transcripts",
        url: "/demo/sources/src_demo-radio-vance-2026-02-12",
        title: "Transcript: radio interview (demonstration)",
        publisher: "Office of the Minister for Regional Infrastructure (demonstration)",
        tier: 1,
        fetchedAt: new Date().toISOString(),
        publishedAt: ctx.runDate,
        mediaType: "text",
        raw:
          "MINISTER: Look, the facts are clear. Since we came to government, regional road fatalities have fallen by 40 per cent. " +
          "And I think Australians are worse off under the other side's plans. " +
          "We will also fund 300 kilometres of new regional rail this term.",
      },
    ];
  },

  /** Real: HTML/PDF text extraction; speech-to-text for audio/video; speaker diarisation aligned to the politician register. */
  async extractText(docs, ctx): Promise<ExtractedText[]> {
    ctx.log(`extractText: ${docs.length} document(s)`);
    return docs.map((d) => ({
      documentId: d.id,
      text: d.raw,
      language: "en",
      segments: d.raw.split(/(?<=\.)\s+/).map((text, i) => ({ speaker: "MINISTER", politicianId: "pol_demo-vance-eleanor", text, offset: i })),
    }));
  },

  /** Real: LLM extraction of discrete factual assertions with checkability reasoning and issue tagging. */
  async extractClaims(texts, ctx): Promise<CandidateClaim[]> {
    const out: CandidateClaim[] = [];
    for (const t of texts) {
      t.segments.forEach((seg, i) => {
        const sentence = seg.text.replace(/^MINISTER:\s*/, "").trim();
        if (!sentence) return;
        const hasNumber = /\d/.test(sentence);
        const opinion = /\b(think|believe|worse off|better off|best|worst)\b/i.test(sentence);
        const future = /\bwill\b/i.test(sentence);
        out.push({
          id: `cand_${ctx.runDate}-${String(out.length + 1).padStart(3, "0")}`,
          documentId: t.documentId,
          politicianId: seg.politicianId,
          speakerName: seg.speaker,
          quote: sentence,
          summary: sentence.length > 90 ? `${sentence.slice(0, 87)}…` : sentence,
          date: ctx.runDate,
          context: `Radio interview (segment ${i + 1})`,
          issueIds: /road|rail|infrastructure/i.test(sentence) ? ["iss_infrastructure"] : ["iss_economy"],
          checkable: hasNumber && !opinion && !future,
          checkabilityReason: opinion ? "Evaluative statement" : future ? "Commitment or prediction about the future" : hasNumber ? "Contains a checkable figure" : "No checkable assertion",
        });
      });
    }
    ctx.log(`extractClaims: ${out.length} candidate(s), ${out.filter((c) => c.checkable).length} checkable`);
    return out;
  },

  /** Real: vector search over claim records plus exact-figure matching; flags evidence updated since the last check. */
  async matchClaims(candidates, ctx): Promise<ClaimMatch[]> {
    const repo = await getRepository();
    const existing = await repo.listClaims();
    const matches = candidates.map((candidate) => {
      const similar = existing
        .map((c) => ({ claimId: c.claim.id, similarity: Number(similarity(candidate.quote, c.claim.quote).toFixed(2)) }))
        .filter((s) => s.similarity >= 0.3)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);
      const best = similar[0];
      return {
        candidate,
        similar,
        repeatsClaimId: best && best.similarity >= REPETITION_THRESHOLD ? best.claimId : undefined,
        evidenceChangedSinceCheck: false,
      };
    });
    ctx.log(`matchClaims: ${matches.filter((m) => m.repeatsClaimId).length} repetition(s) detected`);
    return matches;
  },

  /** Real: query Tier 1 data APIs (ABS, RBA, Treasury, departmental data), then Tier 2 fact-checkers and newsrooms. */
  async retrieveEvidence(matches, ctx): Promise<EvidenceBundle[]> {
    const repo = await getRepository();
    const bundles: EvidenceBundle[] = [];
    for (const m of matches) {
      const sources: CandidateSource[] = [];
      const contradictory: CandidateSource[] = [];
      if (m.repeatsClaimId) {
        const detail = await repo.getClaim(m.repeatsClaimId);
        for (const s of detail?.sources ?? []) {
          const cs: CandidateSource = { url: s.source.url, title: s.source.title, publisher: s.source.publisher, tier: s.source.tier, qualityNote: `${s.role} source on the previously checked claim` };
          if (s.role === "contradictory") contradictory.push(cs);
          else if (s.role !== "original" && s.role !== "response") sources.push(cs);
        }
      }
      bundles.push({ candidateId: m.candidate.id, sources, contradictorySources: contradictory });
    }
    ctx.log(`retrieveEvidence: ${bundles.reduce((n, b) => n + b.sources.length + b.contradictorySources.length, 0)} source(s) attached`);
    return bundles;
  },

  /** Real: domain allow-lists per tier, partisan-source detection, recency checks against release calendars. */
  async checkSourceQuality(bundles, ctx): Promise<QualityReport[]> {
    const reports = bundles.map((b) => {
      const all = [...b.sources, ...b.contradictorySources];
      const tier1Count = all.filter((s) => s.tier === 1).length;
      const tier2Count = all.filter((s) => s.tier === 2).length;
      const tier3Count = all.filter((s) => s.tier === 3).length;
      const notes: string[] = [];
      if (all.length === 0) notes.push("No evidence located.");
      if (all.length === 1) notes.push("Single source only.");
      if (tier1Count === 0 && all.length > 0) notes.push("No Tier 1 source.");
      return { candidateId: b.candidateId, tier1Count, tier2Count, tier3Count, partisanOnly: false, singleSource: all.length === 1, belowStandard: tier1Count === 0 && tier2Count === 0, notes };
    });
    ctx.log(`checkSourceQuality: ${reports.filter((r) => r.belowStandard).length} candidate(s) below the evidence standard`);
    return reports;
  },

  /** Real: same as matching but also checks the review queue for pending items on the same statement. */
  async detectDuplicates(matches, ctx): Promise<DuplicateDecision[]> {
    const repo = await getRepository();
    const pending = await repo.listReviewQueue({ status: "pending" });
    const decisions = matches.map((m) => {
      const inQueue = pending.some((p) => similarity(p.claimText, m.candidate.quote) >= REPETITION_THRESHOLD);
      return {
        candidateId: m.candidate.id,
        isDuplicate: inQueue,
        duplicateOfClaimId: m.repeatsClaimId,
        recordAsRepetition: Boolean(m.repeatsClaimId),
      };
    });
    ctx.log(`detectDuplicates: ${decisions.filter((d) => d.isDuplicate).length} already in the review queue`);
    return decisions;
  },

  /** Real: LLM drafts the findings and context from the retrieved evidence, citing each source; never invents sources. */
  async draft({ matches, bundles, quality, duplicates }, ctx): Promise<Draft[]> {
    const repo = await getRepository();
    const drafts: Draft[] = [];
    for (const m of matches) {
      const bundle = bundles.find((b) => b.candidateId === m.candidate.id)!;
      const q = quality.find((r) => r.candidateId === m.candidate.id)!;
      const dup = duplicates.find((d) => d.candidateId === m.candidate.id)!;
      if (dup.isDuplicate) continue;
      const flags: RiskFlag[] = [];
      if (!m.candidate.checkable) flags.push("opinion_not_fact");
      if (q.singleSource) flags.push("single_source");
      if (q.belowStandard && bundle.sources.length + bundle.contradictorySources.length > 0) flags.push("low_source_quality");
      if (dup.recordAsRepetition) flags.push("possible_duplicate");
      const serious = SERIOUS_PATTERNS.test(m.candidate.quote);
      if (serious) flags.push("serious_allegation", "defamation_review");

      let suggested: Draft["suggestedStatus"] = m.candidate.checkable ? "insufficient" : "not_checkable";
      let explanation = `Draft: ${m.candidate.checkabilityReason}.`;
      if (dup.recordAsRepetition && m.repeatsClaimId) {
        const prior = await repo.getClaim(m.repeatsClaimId);
        if (prior) {
          suggested = prior.assessment.status;
          explanation = `Draft: this statement substantially repeats claim ${prior.claim.id} (checked ${prior.assessment.reviewedAt}, "${prior.assessment.findings.slice(0, 120)}…"). Recommend recording as a repetition; the existing evidence applies${m.evidenceChangedSinceCheck ? ", but evidence has changed since the last check and must be refreshed" : ""}.`;
        }
      } else if (m.candidate.checkable && bundle.sources.length === 0) {
        explanation += " No evidence located automatically; a reviewer must retrieve the relevant dataset before classification.";
      }

      drafts.push({
        candidateId: m.candidate.id,
        targetType: serious ? "conduct" : "claim",
        targetId: dup.recordAsRepetition ? m.repeatsClaimId : undefined,
        politicianId: m.candidate.politicianId,
        claimText: m.candidate.quote,
        suggestedStatus: suggested,
        aiExplanation: explanation,
        sources: bundle.sources,
        contradictorySources: bundle.contradictorySources,
        similarClaims: m.similar,
        riskFlags: flags,
      });
    }
    ctx.log(`draft: ${drafts.length} draft(s)`);
    return drafts;
  },

  /**
   * Human-review gate. Every draft requires a human decision. Serious matters
   * are additionally blocked from approval until a qualifying source exists.
   */
  async gate(drafts, ctx): Promise<GateDecision[]> {
    const decisions = drafts.map((draft) => {
      const blockers: string[] = [];
      const serious = draft.targetType === "integrity" || draft.targetType === "conduct" || draft.riskFlags.includes("serious_allegation");
      if (serious) {
        const qualifying = draft.sources.some((s) => s.tier <= 2);
        if (!qualifying) blockers.push("Serious matter without an official record or established-newsroom source. Cannot be approved.");
        blockers.push("Legal/defamation review required before publication.");
      }
      return { draft, requiresHumanReview: true as const, blockers };
    });
    ctx.log(`gate: ${decisions.length} item(s) require human review; ${decisions.filter((d) => d.blockers.length > 0).length} carry hard blockers`);
    return decisions;
  },

  /**
   * Publish step. Drafts are NEVER written to claims/integrity/conduct tables
   * here. They are written to the review queue; the reviewer UI publishes on
   * approval and writes the change log and daily update.
   */
  async publish(decisions, ctx) {
    if (ctx.dryRun) {
      ctx.log(`publish (dry run): would enqueue ${decisions.length} review item(s)`);
      return [];
    }
    const repo = await getRepository();
    const items = [];
    for (const d of decisions) {
      items.push(
        await repo.submitReviewItem({
          kind: "ai_discovery",
          targetType: d.draft.targetType,
          targetId: d.draft.targetId,
          politicianId: d.draft.politicianId,
          submittedBy: "pipeline",
          claimText: d.draft.claimText,
          aiExplanation: d.blockers.length ? `${d.draft.aiExplanation} BLOCKERS: ${d.blockers.join(" ")}` : d.draft.aiExplanation,
          sources: d.draft.sources,
          riskFlags: d.draft.riskFlags,
        }),
      );
    }
    ctx.log(`publish: ${items.length} item(s) enqueued for human review`);
    return items;
  },
};
