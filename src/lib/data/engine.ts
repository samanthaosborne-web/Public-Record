/**
 * In-memory query engine.
 *
 * Both the JSON adapter (prototype) and the Supabase adapter build a
 * `Dataset` and hand it to this class. Every read model used by the UI is
 * derived here, so swapping the storage layer never touches components.
 * When query volume grows, individual methods can be pushed down to SQL
 * one at a time without changing the `PublicRecordRepository` contract.
 */
import type {
  ChangeLogEntry,
  Claim,
  ClaimAssessment,
  ConductMatter,
  Correction,
  Dataset,
  IntegrityMatter,
  ISODate,
  Issue,
  Party,
  PartyId,
  Politician,
  PoliticianStats,
  ReviewQueueItem,
  ReviewStatus,
  SiteStats,
  Source,
} from "../types";
import { INTEGRITY_STATUS } from "../labels";
import { formatDate } from "../format";
import type {
  ClaimDetail,
  ClaimFilter,
  ClaimListItem,
  ConductFilter,
  ConductMatterDetail,
  ConductMatterItem,
  CorrectionItem,
  DailyUpdateItem,
  IntegrityFilter,
  IntegrityMatterDetail,
  IntegrityMatterItem,
  NewReviewItem,
  PoliticianFilter,
  PoliticianProfile,
  PublicRecordRepository,
  SearchResults,
} from "./repository";

const CORRECTED_STATUSES = new Set(["corrected", "clarified", "retracted", "updated"]);

function byDateDesc<T extends { date: string }>(a: T, b: T): number {
  return b.date.localeCompare(a.date);
}

function groupBy<T>(items: T[], key: (item: T) => string | undefined): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    if (!k) continue;
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function scoreText(haystack: string, query: string, tokens: string[]): number {
  const text = haystack.toLowerCase();
  let score = 0;
  if (query.length > 2 && text.includes(query)) score += 4;
  for (const token of tokens) {
    if (text.includes(token)) score += 1;
  }
  return score;
}

export class InMemoryRepository implements PublicRecordRepository {
  private readonly data: Dataset;
  private readonly partyById = new Map<PartyId, Party>();
  private readonly politicianById = new Map<string, Politician>();
  private readonly politicianBySlug = new Map<string, Politician>();
  private readonly sourceById = new Map<string, Source>();
  private readonly assessmentById = new Map<string, ClaimAssessment>();
  private readonly assessmentsByClaim: Map<string, ClaimAssessment[]>;
  private readonly claimById = new Map<string, Claim>();
  private readonly claimSourcesByClaim;
  private readonly repetitionsByClaim;
  private readonly correctionsByClaim;
  private readonly responsesByRelated;
  private readonly issueById = new Map<string, Issue>();
  private readonly issueBySlug = new Map<string, Issue>();
  private readonly changeLogByRecord;
  /** Mutable copy so submissions and review decisions persist for the process lifetime. */
  private readonly reviewQueue: ReviewQueueItem[];

  constructor(data: Dataset) {
    this.data = data;
    for (const p of data.parties) this.partyById.set(p.id, p);
    for (const p of data.politicians) {
      this.politicianById.set(p.id, p);
      this.politicianBySlug.set(p.slug, p);
    }
    for (const s of data.sources) this.sourceById.set(s.id, s);
    for (const a of data.claimAssessments) this.assessmentById.set(a.id, a);
    for (const c of data.claims) this.claimById.set(c.id, c);
    for (const i of data.issues) {
      this.issueById.set(i.id, i);
      this.issueBySlug.set(i.slug, i);
    }
    this.assessmentsByClaim = groupBy(data.claimAssessments, (a) => a.claimId);
    this.claimSourcesByClaim = groupBy(data.claimSources, (c) => c.claimId);
    this.repetitionsByClaim = groupBy(data.claimRepetitions, (r) => r.claimId);
    this.correctionsByClaim = groupBy(data.corrections, (c) => c.claimId);
    this.responsesByRelated = groupBy(data.responses, (r) => `${r.relatedType}:${r.relatedId}`);
    this.changeLogByRecord = groupBy(data.changeLog, (c) => c.recordId);
    this.reviewQueue = data.reviewQueue.map((item) => ({ ...item }));
  }

  /* ---------------- parties & politicians ---------------- */

  async listParties(): Promise<Party[]> {
    return [...this.data.parties];
  }

  async getParty(id: PartyId): Promise<Party | null> {
    return this.partyById.get(id) ?? null;
  }

  private partyOf(politician: Politician): Party {
    const party = this.partyById.get(politician.partyId);
    if (!party) throw new Error(`Unknown party ${politician.partyId} for ${politician.id}`);
    return party;
  }

  async listPoliticians(filter: PoliticianFilter = {}): Promise<Politician[]> {
    const { partyId, includeDemonstration = false, demonstrationOnly = false, sort = "alphabetical" } = filter;
    const list = this.data.politicians.filter((p) => {
      if (demonstrationOnly) return p.isDemonstration;
      if (!includeDemonstration && p.isDemonstration) return false;
      if (partyId && p.partyId !== partyId) return false;
      return true;
    });
    return list.sort((a, b) => {
      if (sort === "position" && a.positionRank !== b.positionRank) return a.positionRank - b.positionRank;
      return a.sortName.localeCompare(b.sortName);
    });
  }

  async getPoliticianBySlug(slug: string): Promise<Politician | null> {
    return this.politicianBySlug.get(slug) ?? null;
  }

  async getPoliticianById(id: string): Promise<Politician | null> {
    return this.politicianById.get(id) ?? null;
  }

  private currentAssessment(claim: Claim): ClaimAssessment {
    const assessment = this.assessmentById.get(claim.currentAssessmentId);
    if (!assessment) throw new Error(`Claim ${claim.id} has no current assessment`);
    return assessment;
  }

  private computeStats(politicianId: string): PoliticianStats {
    const claims = this.data.claims.filter((c) => c.politicianId === politicianId);
    const stats: PoliticianStats = {
      claimsChecked: 0,
      claimsSupported: 0,
      claimsMixed: 0,
      claimsContradicted: 0,
      claimsInsufficient: 0,
      claimsNotCheckable: 0,
      corrections: 0,
      integrityMatters: 0,
      conductMatters: 0,
    };
    for (const claim of claims) {
      const status = this.currentAssessment(claim).status;
      if (status === "not_checkable") {
        stats.claimsNotCheckable += 1;
        continue;
      }
      stats.claimsChecked += 1;
      if (status === "supported" || status === "mostly_supported") stats.claimsSupported += 1;
      else if (status === "mixed") stats.claimsMixed += 1;
      else if (status === "contradicted") stats.claimsContradicted += 1;
      else stats.claimsInsufficient += 1;
    }
    stats.corrections = this.data.corrections.filter(
      (c) => c.politicianId === politicianId && CORRECTED_STATUSES.has(c.status),
    ).length;
    stats.integrityMatters = this.data.integrityMatters.filter((m) => m.politicianId === politicianId).length;
    stats.conductMatters = this.data.conductMatters.filter((m) => m.politicianId === politicianId).length;
    return stats;
  }

  async getPoliticianStats(politicianId: string): Promise<PoliticianStats> {
    return this.computeStats(politicianId);
  }

  async getSiteStats(opts: { includeDemonstration?: boolean } = {}): Promise<SiteStats> {
    const include = opts.includeDemonstration ?? false;
    const visible = (r: { isDemonstration: boolean }) => include || !r.isDemonstration;
    const stats: SiteStats = {
      claimsChecked: 0,
      claimsSupported: 0,
      claimsRequiringContext: 0,
      claimsContradicted: 0,
      correctionsRecorded: 0,
      activeIntegrityMatters: 0,
      completedIntegrityMatters: 0,
      politiciansProfiled: this.data.politicians.filter((p) => !p.isDemonstration).length,
    };
    for (const claim of this.data.claims.filter(visible)) {
      const status = this.currentAssessment(claim).status;
      if (status === "not_checkable") continue;
      stats.claimsChecked += 1;
      if (status === "supported" || status === "mostly_supported") stats.claimsSupported += 1;
      else if (status === "mixed") stats.claimsRequiringContext += 1;
      else if (status === "contradicted") stats.claimsContradicted += 1;
    }
    for (const correction of this.data.corrections) {
      const claim = this.claimById.get(correction.claimId);
      if (!claim || !visible(claim)) continue;
      if (CORRECTED_STATUSES.has(correction.status)) stats.correctionsRecorded += 1;
    }
    for (const matter of this.data.integrityMatters.filter(visible)) {
      if (INTEGRITY_STATUS[matter.status].active) stats.activeIntegrityMatters += 1;
      else stats.completedIntegrityMatters += 1;
    }
    return stats;
  }

  /* ---------------- claims ---------------- */

  private toClaimListItem(claim: Claim): ClaimListItem {
    const politician = this.politicianById.get(claim.politicianId);
    if (!politician) throw new Error(`Claim ${claim.id} references unknown politician ${claim.politicianId}`);
    const corrections = (this.correctionsByClaim.get(claim.id) ?? []).slice().sort((a, b) =>
      (b.date ?? "").localeCompare(a.date ?? ""),
    );
    return {
      claim,
      assessment: this.currentAssessment(claim),
      politician,
      party: this.partyOf(politician),
      issues: claim.issueIds.map((id) => this.issueById.get(id)).filter((i): i is Issue => Boolean(i)),
      repetitionCount: (this.repetitionsByClaim.get(claim.id) ?? []).length,
      correctionStatus: corrections[0]?.status,
    };
  }

  async listClaims(filter: ClaimFilter = {}): Promise<ClaimListItem[]> {
    const { politicianId, partyId, issueId, status, checkable, includeDemonstration = true, limit } = filter;
    const items = this.data.claims
      .filter((c) => {
        if (!includeDemonstration && c.isDemonstration) return false;
        if (politicianId && c.politicianId !== politicianId) return false;
        if (issueId && !c.issueIds.includes(issueId)) return false;
        if (checkable !== undefined && c.checkable !== checkable) return false;
        if (partyId) {
          const p = this.politicianById.get(c.politicianId);
          if (!p || p.partyId !== partyId) return false;
        }
        if (status && this.currentAssessment(c).status !== status) return false;
        return true;
      })
      .sort(byDateDesc)
      .map((c) => this.toClaimListItem(c));
    return limit ? items.slice(0, limit) : items;
  }

  async getClaim(id: string): Promise<ClaimDetail | null> {
    const claim = this.claimById.get(id);
    if (!claim) return null;
    const base = this.toClaimListItem(claim);
    const assessments = (this.assessmentsByClaim.get(id) ?? []).slice().sort((a, b) => b.version - a.version);
    const sources = (this.claimSourcesByClaim.get(id) ?? [])
      .map((cs) => {
        const source = this.sourceById.get(cs.sourceId);
        return source ? { role: cs.role, source, note: cs.note } : null;
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => a.source.tier - b.source.tier);
    const repeatsClaim = claim.repeatsClaimId ? this.claimById.get(claim.repeatsClaimId) : undefined;
    const repeatedBy = this.data.claims.filter((c) => c.repeatsClaimId === id).sort(byDateDesc);
    return {
      ...base,
      assessments,
      sources,
      originalSource: this.sourceById.get(claim.originalSourceId) ?? null,
      repetitions: (this.repetitionsByClaim.get(id) ?? []).slice().sort((a, b) => a.date.localeCompare(b.date)),
      corrections: (this.correctionsByClaim.get(id) ?? []).slice().sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
      responses: (this.responsesByRelated.get(`claim:${id}`) ?? []).slice().sort(byDateDesc),
      repeatsClaim: repeatsClaim ? this.toClaimListItem(repeatsClaim) : null,
      repeatedBy: repeatedBy.map((c) => this.toClaimListItem(c)),
      changeLog: (this.changeLogByRecord.get(id) ?? []).slice().sort(byDateDesc),
    };
  }

  /* ---------------- integrity ---------------- */

  private toIntegrityItem(matter: IntegrityMatter): IntegrityMatterItem {
    const politician = this.politicianById.get(matter.politicianId);
    if (!politician) throw new Error(`Integrity matter ${matter.id} references unknown politician`);
    return { matter, politician, party: this.partyOf(politician) };
  }

  async listIntegrityMatters(filter: IntegrityFilter = {}): Promise<IntegrityMatterItem[]> {
    const { politicianId, status, includeDemonstration = true } = filter;
    return this.data.integrityMatters
      .filter((m) => {
        if (!includeDemonstration && m.isDemonstration) return false;
        if (politicianId && m.politicianId !== politicianId) return false;
        if (status && m.status !== status) return false;
        return true;
      })
      .sort(byDateDesc)
      .map((m) => this.toIntegrityItem(m));
  }

  private sourcesFor(ids: string[]): Source[] {
    return ids.map((id) => this.sourceById.get(id)).filter((s): s is Source => Boolean(s));
  }

  async getIntegrityMatter(id: string): Promise<IntegrityMatterDetail | null> {
    const matter = this.data.integrityMatters.find((m) => m.id === id);
    if (!matter) return null;
    const response = matter.responseId ? this.data.responses.find((r) => r.id === matter.responseId) ?? null : null;
    return {
      ...this.toIntegrityItem(matter),
      primarySources: this.sourcesFor(matter.primarySourceIds),
      independentSources: this.sourcesFor(matter.independentSourceIds),
      response,
      responseSource: response?.sourceId ? this.sourceById.get(response.sourceId) ?? null : null,
      changeLog: (this.changeLogByRecord.get(id) ?? []).slice().sort(byDateDesc),
    };
  }

  /* ---------------- conduct ---------------- */

  private toConductItem(matter: ConductMatter): ConductMatterItem {
    const politician = this.politicianById.get(matter.politicianId);
    if (!politician) throw new Error(`Conduct matter ${matter.id} references unknown politician`);
    return { matter, politician, party: this.partyOf(politician) };
  }

  async listConductMatters(filter: ConductFilter = {}): Promise<ConductMatterItem[]> {
    const { politicianId, includeDemonstration = true } = filter;
    return this.data.conductMatters
      .filter((m) => {
        if (!includeDemonstration && m.isDemonstration) return false;
        if (politicianId && m.politicianId !== politicianId) return false;
        return true;
      })
      .sort(byDateDesc)
      .map((m) => this.toConductItem(m));
  }

  async getConductMatter(id: string): Promise<ConductMatterDetail | null> {
    const matter = this.data.conductMatters.find((m) => m.id === id);
    if (!matter) return null;
    const response = matter.responseId ? this.data.responses.find((r) => r.id === matter.responseId) ?? null : null;
    return {
      ...this.toConductItem(matter),
      primarySources: this.sourcesFor(matter.primarySourceIds),
      independentSources: this.sourcesFor(matter.independentSourceIds),
      response,
      responseSource: response?.sourceId ? this.sourceById.get(response.sourceId) ?? null : null,
      changeLog: (this.changeLogByRecord.get(id) ?? []).slice().sort(byDateDesc),
    };
  }

  /* ---------------- corrections ---------------- */

  private toCorrectionItem(correction: Correction): CorrectionItem | null {
    const claim = this.claimById.get(correction.claimId);
    if (!claim) return null;
    return {
      correction,
      claim: this.toClaimListItem(claim),
      source: correction.sourceId ? this.sourceById.get(correction.sourceId) ?? null : null,
    };
  }

  async listCorrections(filter: { politicianId?: string; includeDemonstration?: boolean } = {}): Promise<CorrectionItem[]> {
    const { politicianId, includeDemonstration = true } = filter;
    return this.data.corrections
      .filter((c) => {
        if (politicianId && c.politicianId !== politicianId) return false;
        const claim = this.claimById.get(c.claimId);
        if (!claim) return false;
        if (!includeDemonstration && claim.isDemonstration) return false;
        return true;
      })
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
      .map((c) => this.toCorrectionItem(c))
      .filter((c): c is CorrectionItem => c !== null);
  }

  /* ---------------- profile ---------------- */

  async getPoliticianProfile(slug: string): Promise<PoliticianProfile | null> {
    const politician = this.politicianBySlug.get(slug);
    if (!politician) return null;
    const claims = await this.listClaims({ politicianId: politician.id });
    const corrections = await this.listCorrections({ politicianId: politician.id });
    const integrityMatters = await this.listIntegrityMatters({ politicianId: politician.id });
    const conductMatters = await this.listConductMatters({ politicianId: politician.id });
    const responses = this.data.responses.filter((r) => r.politicianId === politician.id).sort(byDateDesc);

    const sourceIds = new Set<string>();
    for (const item of claims) {
      sourceIds.add(item.claim.originalSourceId);
      for (const cs of this.claimSourcesByClaim.get(item.claim.id) ?? []) sourceIds.add(cs.sourceId);
    }
    for (const m of integrityMatters) {
      m.matter.primarySourceIds.forEach((id) => sourceIds.add(id));
      m.matter.independentSourceIds.forEach((id) => sourceIds.add(id));
    }
    for (const m of conductMatters) {
      m.matter.primarySourceIds.forEach((id) => sourceIds.add(id));
      m.matter.independentSourceIds.forEach((id) => sourceIds.add(id));
    }
    for (const r of responses) if (r.sourceId) sourceIds.add(r.sourceId);
    for (const c of corrections) if (c.correction.sourceId) sourceIds.add(c.correction.sourceId);

    return {
      politician,
      party: this.partyOf(politician),
      stats: this.computeStats(politician.id),
      claims,
      corrections,
      integrityMatters,
      conductMatters,
      responses,
      sources: this.sourcesFor([...sourceIds]).sort((a, b) => a.tier - b.tier || a.publisher.localeCompare(b.publisher)),
      verificationSources: this.sourcesFor(politician.verification.sourceIds),
      changeLog: this.data.changeLog.filter((c) => c.politicianId === politician.id).sort(byDateDesc),
    };
  }

  /* ---------------- sources & issues ---------------- */

  async listSources(): Promise<Source[]> {
    return [...this.data.sources];
  }

  async getSource(id: string): Promise<Source | null> {
    return this.sourceById.get(id) ?? null;
  }

  async listIssues(): Promise<Issue[]> {
    return [...this.data.issues].sort((a, b) => a.name.localeCompare(b.name));
  }

  async getIssueBySlug(slug: string): Promise<Issue | null> {
    return this.issueBySlug.get(slug) ?? null;
  }

  /* ---------------- daily updates ---------------- */

  private hrefFor(relatedType: string, relatedId: string): string {
    switch (relatedType) {
      case "claim":
        return `/claims/${relatedId}`;
      case "integrity":
        return `/integrity/${relatedId}`;
      case "conduct":
        return `/conduct/${relatedId}`;
      case "politician": {
        const p = this.politicianById.get(relatedId);
        return p ? `/politicians/${p.slug}` : "/politicians";
      }
      default:
        return "/";
    }
  }

  async listDailyUpdates(opts: { date?: ISODate; limit?: number } = {}): Promise<DailyUpdateItem[]> {
    const updates = this.data.dailyUpdates
      .filter((u) => !opts.date || u.date === opts.date)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    const sliced = opts.limit ? updates.slice(0, opts.limit) : updates;
    return sliced.map((update) => {
      const politician = update.politicianId ? this.politicianById.get(update.politicianId) ?? null : null;
      return {
        update,
        politician,
        party: politician ? this.partyOf(politician) : null,
        href: this.hrefFor(update.relatedType, update.relatedId),
      };
    });
  }

  async listUpdateDates(): Promise<ISODate[]> {
    return [...new Set(this.data.dailyUpdates.map((u) => u.date))].sort((a, b) => b.localeCompare(a));
  }

  async latestUpdateDate(): Promise<ISODate | null> {
    const dates = await this.listUpdateDates();
    return dates[0] ?? null;
  }

  /* ---------------- review queue ---------------- */

  async listReviewQueue(opts: { status?: ReviewStatus } = {}): Promise<ReviewQueueItem[]> {
    return this.reviewQueue
      .filter((i) => !opts.status || i.status === opts.status)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }

  async getReviewItem(id: string): Promise<ReviewQueueItem | null> {
    return this.reviewQueue.find((i) => i.id === id) ?? null;
  }

  async submitReviewItem(input: NewReviewItem): Promise<ReviewQueueItem> {
    const now = new Date().toISOString();
    const serious = input.targetType === "integrity" || input.targetType === "conduct";
    const item: ReviewQueueItem = {
      id: `rev_${now.slice(0, 10).replace(/-/g, "")}-${String(this.reviewQueue.length + 1).padStart(4, "0")}`,
      kind: input.kind,
      status: "pending",
      targetType: input.targetType,
      targetId: input.targetId,
      politicianId: input.politicianId,
      submittedAt: now,
      submittedBy: input.submittedBy,
      claimText: input.claimText,
      aiExplanation: input.aiExplanation,
      sources: input.sources,
      contradictorySources: [],
      similarClaims: [],
      riskFlags: [...(input.riskFlags ?? []), ...(serious ? (["serious_allegation", "defamation_review"] as const) : [])],
      requiresHumanReview: true,
      createdAt: now,
      updatedAt: now,
    };
    this.reviewQueue.unshift(item);
    return item;
  }

  async updateReviewItem(id: string, patch: { status: ReviewStatus; reviewerNotes?: string }): Promise<ReviewQueueItem | null> {
    const item = this.reviewQueue.find((i) => i.id === id);
    if (!item) return null;
    const now = new Date().toISOString();
    item.status = patch.status;
    if (patch.reviewerNotes !== undefined) item.reviewerNotes = patch.reviewerNotes;
    item.reviewedAt = now;
    item.updatedAt = now;
    return item;
  }

  /* ---------------- change log ---------------- */

  async listChangeLog(opts: { recordId?: string; politicianId?: string; limit?: number } = {}): Promise<ChangeLogEntry[]> {
    const entries = this.data.changeLog
      .filter((c) => (!opts.recordId || c.recordId === opts.recordId) && (!opts.politicianId || c.politicianId === opts.politicianId))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    return opts.limit ? entries.slice(0, opts.limit) : entries;
  }

  /* ---------------- search ---------------- */

  async search(rawQuery: string): Promise<SearchResults> {
    const query = rawQuery.trim().toLowerCase();
    const tokens = tokenize(query);
    const empty: SearchResults = { query: rawQuery, politicians: [], claims: [], integrityMatters: [], conductMatters: [], issues: [], total: 0 };
    if (!query || tokens.length === 0) return empty;

    const politicianText = (p: Politician) =>
      [p.fullName, this.partyOf(p).name, this.partyOf(p).shortName, this.partyOf(p).abbreviation, p.electorate ?? "", p.state, p.positionSummary, ...p.positions.map((x) => x.title)].join(" ");

    const politicians = this.data.politicians
      .map((p) => ({ p, score: scoreText(politicianText(p), query, tokens) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.p.sortName.localeCompare(b.p.sortName))
      .map((x) => x.p);

    const claims = this.data.claims
      .map((c) => {
        const item = this.toClaimListItem(c);
        const text = [
          c.quote,
          c.summary,
          c.context,
          c.date,
          formatDate(c.date),
          item.assessment.findings,
          item.assessment.context ?? "",
          item.politician.fullName,
          item.party.name,
          item.party.shortName,
          ...item.issues.map((i) => `${i.name} ${i.keywords.join(" ")}`),
        ].join(" ");
        return { item, score: scoreText(text, query, tokens) };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || b.item.claim.date.localeCompare(a.item.claim.date))
      .map((x) => x.item);

    const integrityMatters = this.data.integrityMatters
      .map((m) => {
        const item = this.toIntegrityItem(m);
        const text = [m.title, m.description, m.organisation, m.outcome ?? "", m.date, formatDate(m.date), item.politician.fullName, item.party.name, INTEGRITY_STATUS[m.status].label].join(" ");
        return { item, score: scoreText(text, query, tokens) };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.item);

    const conductMatters = this.data.conductMatters
      .map((m) => {
        const item = this.toConductItem(m);
        const text = [m.title, m.allegationSummary, m.outcome ?? "", m.date, formatDate(m.date), item.politician.fullName, item.party.name].join(" ");
        return { item, score: scoreText(text, query, tokens) };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.item);

    const issues = this.data.issues
      .map((i) => ({ i, score: scoreText([i.name, i.description, ...i.keywords].join(" "), query, tokens) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.i);

    return {
      query: rawQuery,
      politicians,
      claims,
      integrityMatters,
      conductMatters,
      issues,
      total: politicians.length + claims.length + integrityMatters.length + conductMatters.length + issues.length,
    };
  }
}
