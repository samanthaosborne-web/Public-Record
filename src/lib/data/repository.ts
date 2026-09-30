import type {
  ChangeLogEntry,
  Claim,
  ClaimAssessment,
  ClaimRepetition,
  ClaimSourceRole,
  ConductMatter,
  Correction,
  CorrectionStatus,
  DailyUpdate,
  EvidenceStatus,
  IntegrityMatter,
  IntegrityStatus,
  ISODate,
  Issue,
  Party,
  PartyId,
  Politician,
  PoliticianResponse,
  PoliticianStats,
  ReviewQueueItem,
  ReviewStatus,
  SiteStats,
  Source,
} from "../types";

/* ------------------------------------------------------------------ */
/* Enriched read models returned by the repository                     */
/* ------------------------------------------------------------------ */

export interface ClaimListItem {
  claim: Claim;
  assessment: ClaimAssessment;
  politician: Politician;
  party: Party;
  issues: Issue[];
  repetitionCount: number;
  correctionStatus?: CorrectionStatus;
}

export interface AttachedSource {
  role: ClaimSourceRole;
  source: Source;
  note?: string;
}

export interface ClaimDetail extends ClaimListItem {
  /** All assessments, newest first. */
  assessments: ClaimAssessment[];
  sources: AttachedSource[];
  originalSource: Source | null;
  repetitions: ClaimRepetition[];
  corrections: Correction[];
  responses: PoliticianResponse[];
  /** The earlier claim this one repeats, if any. */
  repeatsClaim: ClaimListItem | null;
  /** Later claim records that repeat this one. */
  repeatedBy: ClaimListItem[];
  changeLog: ChangeLogEntry[];
}

export interface IntegrityMatterItem {
  matter: IntegrityMatter;
  politician: Politician;
  party: Party;
}

export interface IntegrityMatterDetail extends IntegrityMatterItem {
  primarySources: Source[];
  independentSources: Source[];
  response: PoliticianResponse | null;
  responseSource: Source | null;
  changeLog: ChangeLogEntry[];
}

export interface ConductMatterItem {
  matter: ConductMatter;
  politician: Politician;
  party: Party;
}

export interface ConductMatterDetail extends ConductMatterItem {
  primarySources: Source[];
  independentSources: Source[];
  response: PoliticianResponse | null;
  responseSource: Source | null;
  changeLog: ChangeLogEntry[];
}

export interface CorrectionItem {
  correction: Correction;
  claim: ClaimListItem;
  source: Source | null;
}

export interface DailyUpdateItem {
  update: DailyUpdate;
  politician: Politician | null;
  party: Party | null;
  /** Link target inside the site. */
  href: string;
}

export interface PoliticianProfile {
  politician: Politician;
  party: Party;
  stats: PoliticianStats;
  claims: ClaimListItem[];
  corrections: CorrectionItem[];
  integrityMatters: IntegrityMatterItem[];
  conductMatters: ConductMatterItem[];
  responses: PoliticianResponse[];
  sources: Source[];
  verificationSources: Source[];
  changeLog: ChangeLogEntry[];
}

export interface SearchResults {
  query: string;
  politicians: Politician[];
  claims: ClaimListItem[];
  integrityMatters: IntegrityMatterItem[];
  conductMatters: ConductMatterItem[];
  issues: Issue[];
  total: number;
}

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

export type PoliticianSort = "alphabetical" | "position";

export interface PoliticianFilter {
  partyId?: PartyId;
  /** Default: real profiles only. */
  includeDemonstration?: boolean;
  /** Only demonstration profiles. */
  demonstrationOnly?: boolean;
  sort?: PoliticianSort;
}

export interface ClaimFilter {
  politicianId?: string;
  partyId?: PartyId;
  issueId?: string;
  status?: EvidenceStatus;
  checkable?: boolean;
  includeDemonstration?: boolean;
  limit?: number;
}

export interface IntegrityFilter {
  politicianId?: string;
  status?: IntegrityStatus;
  includeDemonstration?: boolean;
}

export interface ConductFilter {
  politicianId?: string;
  includeDemonstration?: boolean;
}

export interface NewReviewItem {
  kind: ReviewQueueItem["kind"];
  targetType: ReviewQueueItem["targetType"];
  targetId?: string;
  politicianId?: string;
  submittedBy: string;
  claimText: string;
  aiExplanation: string;
  sources: ReviewQueueItem["sources"];
  riskFlags?: ReviewQueueItem["riskFlags"];
}

/**
 * The data-access contract used by every page and component.
 *
 * The prototype ships with a JSON adapter (src/lib/data/json-adapter.ts).
 * A Supabase/PostgreSQL adapter can implement the same interface without
 * changing any UI code (see supabase-adapter.ts and supabase/schema.sql).
 */
export interface PublicRecordRepository {
  listParties(): Promise<Party[]>;
  getParty(id: PartyId): Promise<Party | null>;

  listPoliticians(filter?: PoliticianFilter): Promise<Politician[]>;
  getPoliticianBySlug(slug: string): Promise<Politician | null>;
  getPoliticianById(id: string): Promise<Politician | null>;
  getPoliticianProfile(slug: string): Promise<PoliticianProfile | null>;
  getPoliticianStats(politicianId: string): Promise<PoliticianStats>;

  getSiteStats(opts?: { includeDemonstration?: boolean }): Promise<SiteStats>;

  listClaims(filter?: ClaimFilter): Promise<ClaimListItem[]>;
  getClaim(id: string): Promise<ClaimDetail | null>;

  listIntegrityMatters(filter?: IntegrityFilter): Promise<IntegrityMatterItem[]>;
  getIntegrityMatter(id: string): Promise<IntegrityMatterDetail | null>;

  listConductMatters(filter?: ConductFilter): Promise<ConductMatterItem[]>;
  getConductMatter(id: string): Promise<ConductMatterDetail | null>;

  listCorrections(filter?: { politicianId?: string; includeDemonstration?: boolean }): Promise<CorrectionItem[]>;

  listSources(): Promise<Source[]>;
  getSource(id: string): Promise<Source | null>;

  listIssues(): Promise<Issue[]>;
  getIssueBySlug(slug: string): Promise<Issue | null>;

  listDailyUpdates(opts?: { date?: ISODate; limit?: number }): Promise<DailyUpdateItem[]>;
  listUpdateDates(): Promise<ISODate[]>;
  latestUpdateDate(): Promise<ISODate | null>;

  listReviewQueue(opts?: { status?: ReviewStatus }): Promise<ReviewQueueItem[]>;
  getReviewItem(id: string): Promise<ReviewQueueItem | null>;
  submitReviewItem(input: NewReviewItem): Promise<ReviewQueueItem>;
  updateReviewItem(
    id: string,
    patch: { status: ReviewStatus; reviewerNotes?: string },
  ): Promise<ReviewQueueItem | null>;

  listChangeLog(opts?: { recordId?: string; politicianId?: string; limit?: number }): Promise<ChangeLogEntry[]>;

  search(query: string): Promise<SearchResults>;
}
