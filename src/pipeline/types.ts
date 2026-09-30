/**
 * Daily update pipeline — stage contracts.
 *
 *   SOURCE INGESTION → TEXT EXTRACTION → CLAIM EXTRACTION → CLAIM MATCHING →
 *   EVIDENCE RETRIEVAL → SOURCE QUALITY CHECK → DUPLICATE DETECTION →
 *   AI DRAFT → HUMAN REVIEW (gate) → PUBLISH
 *
 * Each stage is a pure function over typed inputs so that real
 * implementations (HTTP fetchers, transcription, an LLM, a database) can
 * replace the mock implementations one at a time. The orchestrator in
 * run-daily-update.ts wires them together and enforces the safety rules.
 */
import type { CandidateSource, ConductStatus, EvidenceStatus, IntegrityStatus, RecordType, ReviewQueueItem, RiskFlag, SimilarClaimRef, SourceTier } from "@/lib/types";

/** A monitored publisher and how to poll it. */
export interface MonitoredSource {
  id: string;
  name: string;
  /** Rough tier the publisher's documents will receive. */
  tier: SourceTier;
  kind: "hansard" | "parliament" | "ministerial" | "party" | "media_release" | "transcript" | "integrity_body" | "court" | "police" | "electoral" | "statistics" | "central_bank" | "treasury" | "auditor" | "news" | "fact_check";
  /** Feed, listing page or API endpoint. */
  url: string;
  /** How often it should be polled, in hours. */
  pollIntervalHours: number;
}

/** A document fetched during ingestion. */
export interface IngestedDocument {
  id: string;
  monitoredSourceId: string;
  url: string;
  title: string;
  publisher: string;
  tier: SourceTier;
  fetchedAt: string;
  publishedAt?: string;
  /** Raw payload: HTML, PDF bytes (base64), audio/video reference, etc. */
  raw: string;
  mediaType: "html" | "pdf" | "audio" | "video" | "text";
}

/** Plain text after extraction / transcription, with speaker attribution where known. */
export interface ExtractedText {
  documentId: string;
  text: string;
  /** Segments attributed to a speaker (Hansard, transcripts). */
  segments: { speaker?: string; politicianId?: string; text: string; offset: number }[];
  language: "en";
}

/** A candidate factual claim found in text. */
export interface CandidateClaim {
  id: string;
  documentId: string;
  politicianId?: string;
  speakerName?: string;
  quote: string;
  summary: string;
  date: string;
  context: string;
  issueIds: string[];
  /** Model's judgement on whether the statement is checkable. */
  checkable: boolean;
  checkabilityReason: string;
}

/** Result of matching a candidate against existing claim records. */
export interface ClaimMatch {
  candidate: CandidateClaim;
  similar: SimilarClaimRef[];
  /** Best match above the repetition threshold, if any. */
  repeatsClaimId?: string;
  /** True when the evidence attached to the matched claim has changed since it was assessed. */
  evidenceChangedSinceCheck: boolean;
}

/** Evidence gathered for a candidate. */
export interface EvidenceBundle {
  candidateId: string;
  sources: CandidateSource[];
  contradictorySources: CandidateSource[];
}

/** Source quality assessment. */
export interface QualityReport {
  candidateId: string;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  partisanOnly: boolean;
  singleSource: boolean;
  belowStandard: boolean;
  notes: string[];
}

/** Duplicate decision. */
export interface DuplicateDecision {
  candidateId: string;
  isDuplicate: boolean;
  duplicateOfClaimId?: string;
  /** Record as a repetition of an existing claim rather than a new record. */
  recordAsRepetition: boolean;
}

/** AI-drafted record, ready for the review queue. */
export interface Draft {
  candidateId: string;
  targetType: RecordType;
  targetId?: string;
  politicianId?: string;
  claimText: string;
  suggestedStatus?: EvidenceStatus | IntegrityStatus | ConductStatus;
  aiExplanation: string;
  sources: CandidateSource[];
  contradictorySources: CandidateSource[];
  similarClaims: SimilarClaimRef[];
  riskFlags: RiskFlag[];
}

/** Outcome of the human-review gate. */
export interface GateDecision {
  draft: Draft;
  /** Always true in this system: nothing publishes without a person. */
  requiresHumanReview: true;
  /** Hard block: the draft may not be approved until these are resolved. */
  blockers: string[];
}

export interface PipelineContext {
  runId: string;
  runDate: string; // ISO date
  dryRun: boolean;
  log: (message: string) => void;
}

export interface PipelineStages {
  ingest(sources: MonitoredSource[], ctx: PipelineContext): Promise<IngestedDocument[]>;
  extractText(docs: IngestedDocument[], ctx: PipelineContext): Promise<ExtractedText[]>;
  extractClaims(texts: ExtractedText[], ctx: PipelineContext): Promise<CandidateClaim[]>;
  matchClaims(candidates: CandidateClaim[], ctx: PipelineContext): Promise<ClaimMatch[]>;
  retrieveEvidence(matches: ClaimMatch[], ctx: PipelineContext): Promise<EvidenceBundle[]>;
  checkSourceQuality(bundles: EvidenceBundle[], ctx: PipelineContext): Promise<QualityReport[]>;
  detectDuplicates(matches: ClaimMatch[], ctx: PipelineContext): Promise<DuplicateDecision[]>;
  draft(input: { matches: ClaimMatch[]; bundles: EvidenceBundle[]; quality: QualityReport[]; duplicates: DuplicateDecision[] }, ctx: PipelineContext): Promise<Draft[]>;
  gate(drafts: Draft[], ctx: PipelineContext): Promise<GateDecision[]>;
  publish(decisions: GateDecision[], ctx: PipelineContext): Promise<ReviewQueueItem[]>;
}
