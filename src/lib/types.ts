/**
 * PUBLIC RECORD — domain types.
 *
 * Every record has a permanent, human-readable ID (prefix + slug/serial) and
 * created_at / updated_at timestamps (ISO 8601). Records are never deleted:
 * superseded assessments stay in the store and are linked via
 * `supersedesAssessmentId`, and material changes are written to the change log.
 *
 * These types are shared by the JSON adapter (prototype) and the Supabase
 * adapter (production). Field names use camelCase in TypeScript and snake_case
 * in SQL (see supabase/schema.sql); the adapters do the mapping.
 */

export type ISODate = string; // "2026-09-30"
export type ISODateTime = string; // "2026-09-30T08:00:00+10:00"

export interface Timestamps {
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/* ------------------------------------------------------------------ */
/* Parties and politicians                                             */
/* ------------------------------------------------------------------ */

export type PartyId =
  | "alp"
  | "lib"
  | "nat"
  | "grn"
  | "on"
  | "ind"
  | "demo-harbour"
  | "demo-civic"
  | "demo-ind";

export interface Party extends Timestamps {
  id: PartyId;
  name: string; // "Australian Labor Party"
  shortName: string; // "Labor"
  abbreviation: string; // "ALP"
  /** Party colour, used ONLY as a small identifying accent (dot / hairline). */
  accentColour: string;
  /** Appears in the homepage filter row. Demonstration parties do not. */
  filterLabel?: string;
  isDemonstration: boolean;
}

export type Chamber = "house" | "senate";

export type AustralianState =
  | "NSW"
  | "VIC"
  | "QLD"
  | "WA"
  | "SA"
  | "TAS"
  | "ACT"
  | "NT";

export type PositionType =
  | "executive" // PM, ministers, assistant ministers
  | "opposition" // Leader of the Opposition, shadow ministers
  | "party" // party leader / deputy, whips, spokespersons
  | "parliamentary" // committee chairs, presiding officers
  | "backbench";

export interface Position {
  title: string;
  type: PositionType;
  since?: ISODate;
  /** Where this was verified (source ID). */
  sourceId?: string;
}

export interface CareerEntry {
  title: string;
  type: PositionType;
  from?: ISODate;
  to?: ISODate;
}

export interface VerificationRecord {
  verifiedAt: ISODate;
  /** Source IDs used to verify name, party, seat and current office. */
  sourceIds: string[];
  notes?: string;
}

export interface Politician extends Timestamps {
  id: string; // "pol_albanese-anthony"
  slug: string; // "anthony-albanese"
  fullName: string;
  givenName: string;
  familyName: string;
  /** Sort key: family name first. */
  sortName: string;
  partyId: PartyId;
  /** e.g. "Sits in the Nationals party room as an LNP member". */
  partyNote?: string;
  chamber: Chamber;
  /** House members only. */
  electorate?: string;
  state: AustralianState;
  positions: Position[];
  /** One line shown on cards, e.g. "Prime Minister". */
  positionSummary: string;
  /** Used to order profiles "by parliamentary position" (lower = more senior). */
  positionRank: number;
  /** Neutral summary of parliamentary service, from the official record. */
  parliamentaryService?: string;
  /** Positions held (current and previous), from the official record. */
  career?: CareerEntry[];
  /** Current committee memberships. */
  committees?: string[];
  /** Name as displayed on the APH profile, e.g. "Senator the Hon Penny Wong". */
  aphDisplayName?: string;
  aphId?: string;
  aphProfileUrl?: string;
  officialWebsite?: string;
  photoUrl?: string;
  photoCredit?: string;
  firstElected?: number;
  /** True for fictional profiles used to demonstrate the record format. */
  isDemonstration: boolean;
  verification: VerificationRecord;
  /** Last time any record attached to this profile changed. */
  lastRecordUpdate: ISODate;
}

/* ------------------------------------------------------------------ */
/* Sources                                                             */
/* ------------------------------------------------------------------ */

/** Source hierarchy. Tier 1 = primary/official; 2 = high-quality independent; 3 = supporting. */
export type SourceTier = 1 | 2 | 3;

export type SourceKind =
  | "hansard"
  | "parliamentary_document"
  | "legislation"
  | "dataset"
  | "official_report"
  | "official_statement"
  | "court_document"
  | "police_statement"
  | "integrity_body"
  | "media_release"
  | "transcript"
  | "news_report"
  | "fact_check"
  | "official_profile"
  | "other";

export interface Source extends Timestamps {
  id: string; // "src_abs-labour-force-2026-08"
  title: string;
  publisher: string;
  url: string;
  tier: SourceTier;
  kind: SourceKind;
  publishedAt?: ISODate;
  accessedAt: ISODate;
  /** Short note on what the source establishes. */
  note?: string;
  /** Demonstration sources point at mock documents inside this site. */
  isDemonstration: boolean;
}

/* ------------------------------------------------------------------ */
/* Claims                                                              */
/* ------------------------------------------------------------------ */

export type EvidenceStatus =
  | "supported"
  | "mostly_supported"
  | "mixed"
  | "contradicted"
  | "insufficient"
  | "unverifiable"
  | "not_checkable";

export interface Claim extends Timestamps {
  id: string; // "clm_0001"
  politicianId: string;
  /** Verbatim or near-verbatim statement. */
  quote: string;
  /** Short neutral restatement used in lists and search. */
  summary: string;
  date: ISODate;
  /** How precisely the statement is dated. "month"/"year" dates are shown as e.g. "December 2024". */
  datePrecision?: "day" | "month" | "year";
  /** e.g. "Press conference, Canberra" / "House of Representatives, Question Time". */
  context: string;
  /** Issue/topic IDs (see Issue). */
  issueIds: string[];
  /** Source that records the statement (Hansard, transcript, media release). */
  originalSourceId: string;
  /** False for opinion, prediction or value statements. */
  checkable: boolean;
  /** The assessment currently in force. Earlier ones remain in the store. */
  currentAssessmentId: string;
  /** Set when this claim substantially repeats an earlier claim record. */
  repeatsClaimId?: string;
  isDemonstration: boolean;
}

export interface ClaimAssessment extends Timestamps {
  id: string; // "asm_0001-v1"
  claimId: string;
  version: number;
  status: EvidenceStatus;
  /** "What the evidence shows" — short, neutral. */
  findings: string;
  /** Definitions, denominators, dates, measurement changes. */
  context?: string;
  reviewedAt: ISODate;
  reviewedBy: "human" | "ai_draft";
  /** The assessment this one replaced, if any. */
  supersedesAssessmentId?: string;
}

export type ClaimSourceRole =
  | "original" // where the statement was made/recorded
  | "primary" // Tier 1 evidence
  | "independent" // Tier 2 reporting or fact-checks
  | "contradictory" // evidence that cuts against the claim
  | "supporting" // Tier 3
  | "response"; // politician's response / correction source

export interface ClaimSource extends Timestamps {
  id: string;
  claimId: string;
  sourceId: string;
  role: ClaimSourceRole;
  /** What this source shows in relation to the claim. */
  note?: string;
}

export interface ClaimRepetition extends Timestamps {
  id: string;
  claimId: string;
  date: ISODate;
  context: string;
  sourceId?: string;
  /** True if the statement was materially reworded. */
  reworded: boolean;
  /** True if evidence available at this date differed from the original check. */
  evidenceChanged: boolean;
}

/** What the politician did after a claim was checked. Motivation is never inferred. */
export type CorrectionStatus =
  | "corrected"
  | "clarified"
  | "retracted"
  | "updated"
  | "repeated_unchanged"
  | "no_correction_located";

export interface Correction extends Timestamps {
  id: string;
  claimId: string;
  politicianId: string;
  status: CorrectionStatus;
  date?: ISODate;
  /** Neutral description: what was said, where, and what changed. */
  description: string;
  sourceId?: string;
}

/* ------------------------------------------------------------------ */
/* Integrity matters                                                   */
/* ------------------------------------------------------------------ */

export type IntegrityStatus =
  | "allegation"
  | "referral"
  | "preliminary_assessment"
  | "formal_investigation"
  | "official_finding"
  | "referred_for_prosecution"
  | "charged"
  | "convicted"
  | "cleared"
  | "no_finding"
  | "dismissed"
  | "overturned_appealed";

export interface StatusEvent<TStatus extends string> {
  status: TStatus;
  date: ISODate;
  note?: string;
  sourceId?: string;
}

export interface IntegrityMatter extends Timestamps {
  id: string; // "int_0001"
  title: string;
  politicianId: string;
  date: ISODate;
  organisation: string;
  description: string;
  status: IntegrityStatus;
  statusHistory: StatusEvent<IntegrityStatus>[];
  primarySourceIds: string[];
  independentSourceIds: string[];
  responseId?: string;
  outcome?: string;
  lastCheckedAt: ISODate;
  /** "human" once an editor has signed off; "ai_draft" while drafted from the cited records and awaiting sign-off. */
  reviewedBy: "human" | "ai_draft";
  /** Date a human approved publication. Required when reviewedBy is "human". */
  humanReviewedAt?: ISODate;
  isDemonstration: boolean;
}

/* ------------------------------------------------------------------ */
/* Serious conduct matters                                             */
/* ------------------------------------------------------------------ */

export type ConductStatus =
  | "allegation"
  | "police_report"
  | "police_investigation"
  | "civil_proceeding"
  | "criminal_charge"
  | "trial"
  | "conviction"
  | "acquittal"
  | "matter_withdrawn"
  | "no_charges_laid"
  | "investigation_closed"
  | "finding_overturned";

export type ConductEvidenceBasis =
  | "official_record" // court, police or parliamentary record
  | "credible_reporting"; // substantial reporting by established news organisations

export interface ConductMatter extends Timestamps {
  id: string; // "cnd_0001"
  title: string;
  politicianId: string;
  date: ISODate;
  /** Always phrased as an attributed allegation, never as an established fact. */
  allegationSummary: string;
  status: ConductStatus;
  statusHistory: StatusEvent<ConductStatus>[];
  evidenceBasis: ConductEvidenceBasis;
  primarySourceIds: string[];
  independentSourceIds: string[];
  responseId?: string;
  outcome?: string;
  lastCheckedAt: ISODate;
  reviewedBy: "human" | "ai_draft";
  humanReviewedAt?: ISODate;
  isDemonstration: boolean;
}

/* ------------------------------------------------------------------ */
/* Responses                                                           */
/* ------------------------------------------------------------------ */

export type RecordType = "claim" | "integrity" | "conduct" | "politician";

export interface PoliticianResponse extends Timestamps {
  id: string; // "rsp_0001"
  politicianId: string;
  relatedType: RecordType;
  relatedId: string;
  date: ISODate;
  kind: "correction" | "clarification" | "defence" | "denial" | "statement" | "no_response_located";
  summary: string;
  quote?: string;
  sourceId?: string;
}

/* ------------------------------------------------------------------ */
/* Issues / topics                                                     */
/* ------------------------------------------------------------------ */

export interface Issue extends Timestamps {
  id: string; // "iss_economy"
  slug: string;
  name: string;
  description: string;
  keywords: string[];
}

/* ------------------------------------------------------------------ */
/* Daily update feed                                                   */
/* ------------------------------------------------------------------ */

export type DailyUpdateType =
  | "new_claim"
  | "claim_updated"
  | "correction"
  | "investigation_opened"
  | "investigation_closed"
  | "new_official_finding"
  | "court_update"
  | "repeated_claim"
  | "conduct_update"
  | "profile_verified";

export interface DailyUpdate extends Timestamps {
  id: string; // "upd_2026-09-30-001"
  date: ISODate;
  type: DailyUpdateType;
  title: string;
  summary: string;
  relatedType: RecordType;
  relatedId: string;
  politicianId?: string;
}

/* ------------------------------------------------------------------ */
/* Review queue (AI drafts and public submissions)                     */
/* ------------------------------------------------------------------ */

export type ReviewItemKind =
  | "ai_discovery"
  | "public_submission"
  | "politician_response"
  | "evidence_update";

export type ReviewStatus =
  | "pending"
  | "approved"
  | "edited"
  | "rejected"
  | "needs_evidence"
  | "duplicate";

export type RiskFlag =
  | "serious_allegation"
  | "integrity_matter"
  | "single_source"
  | "partisan_source_only"
  | "possible_duplicate"
  | "low_source_quality"
  | "defamation_review"
  | "stale_evidence"
  | "opinion_not_fact";

export interface CandidateSource {
  url: string;
  title: string;
  publisher: string;
  tier: SourceTier;
  qualityNote: string;
}

export interface SimilarClaimRef {
  claimId: string;
  similarity: number; // 0..1
}

export interface ReviewQueueItem extends Timestamps {
  id: string; // "rev_0001"
  kind: ReviewItemKind;
  status: ReviewStatus;
  /** Which record type would be created or changed on approval. */
  targetType: RecordType;
  /** Existing record this item relates to, if any. */
  targetId?: string;
  politicianId?: string;
  submittedAt: ISODateTime;
  submittedBy: string; // "pipeline" | role of a submitter ("member of the public", "journalist", ...)
  claimText: string;
  suggestedStatus?: EvidenceStatus | IntegrityStatus | ConductStatus;
  aiExplanation: string;
  sources: CandidateSource[];
  contradictorySources: CandidateSource[];
  similarClaims: SimilarClaimRef[];
  riskFlags: RiskFlag[];
  /** Always true for integrity and conduct matters — they are never auto-published. */
  requiresHumanReview: boolean;
  reviewerNotes?: string;
  reviewedAt?: ISODateTime;
}

/* ------------------------------------------------------------------ */
/* Change log (PUBLIC RECORD's own corrections)                        */
/* ------------------------------------------------------------------ */

export type ChangeKind =
  | "classification_changed"
  | "evidence_added"
  | "record_created"
  | "record_amended"
  | "status_changed"
  | "response_added"
  | "profile_updated";

export interface ChangeLogEntry extends Timestamps {
  id: string; // "chg_0001"
  date: ISODate;
  kind: ChangeKind;
  recordType: RecordType;
  recordId: string;
  politicianId?: string;
  summary: string;
  previousValue?: string;
  newValue?: string;
  reason: string;
}

/* ------------------------------------------------------------------ */
/* Aggregates                                                          */
/* ------------------------------------------------------------------ */

export interface PoliticianStats {
  claimsChecked: number;
  claimsSupported: number;
  claimsMixed: number;
  claimsContradicted: number;
  claimsInsufficient: number;
  claimsNotCheckable: number;
  corrections: number;
  integrityMatters: number;
  conductMatters: number;
}

export interface SiteStats {
  claimsChecked: number;
  claimsSupported: number;
  claimsRequiringContext: number;
  claimsContradicted: number;
  correctionsRecorded: number;
  activeIntegrityMatters: number;
  completedIntegrityMatters: number;
  politiciansProfiled: number;
}

/** The whole store, as loaded by an adapter. */
export interface Dataset {
  parties: Party[];
  politicians: Politician[];
  sources: Source[];
  claims: Claim[];
  claimAssessments: ClaimAssessment[];
  claimSources: ClaimSource[];
  claimRepetitions: ClaimRepetition[];
  corrections: Correction[];
  integrityMatters: IntegrityMatter[];
  conductMatters: ConductMatter[];
  responses: PoliticianResponse[];
  issues: Issue[];
  dailyUpdates: DailyUpdate[];
  reviewQueue: ReviewQueueItem[];
  changeLog: ChangeLogEntry[];
}
