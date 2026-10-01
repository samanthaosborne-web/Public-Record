/**
 * Ingests curated research into the JSON database.
 *
 *   node scripts/ingest-research.cjs scripts/research/<date>
 *
 * Expects in that directory:
 *   claims.json   — curated fact-checked claims (see shape below)
 *   records.json  — { careers: [...], integrityMatters: [...], conductMatters: [...] }
 *
 * Every record it creates is marked reviewedBy: "ai_draft" so the site shows
 * "AI draft · pending editorial review" until an editor signs off. Re-running
 * is idempotent: records are keyed by deterministic IDs and replaced in place.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const dir = process.argv[2];
if (!dir) throw new Error("usage: node scripts/ingest-research.cjs <research-dir>");
const DATA = path.join(__dirname, "..", "src", "data");
const RUN_DATE = path.basename(dir).match(/^\d{4}-\d{2}-\d{2}$/) ? path.basename(dir) : new Date().toISOString().slice(0, 10);
const NOW = `${RUN_DATE}T09:00:00+10:00`;

const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));
const write = (f, rows) => fs.writeFileSync(path.join(DATA, f), JSON.stringify(rows, null, 2) + "\n");
const readInput = (f) => (fs.existsSync(path.join(dir, f)) ? JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) : null);
/** Reads <stem>.json plus every <stem>-<party>.json in the research directory. */
const readAll = (stem) => fs.readdirSync(dir).filter((f) => f === `${stem}.json` || (f.startsWith(`${stem}-`) && f.endsWith(".json"))).sort().map((f) => readInput(f));

const db = {
  politicians: read("politicians.json"), sources: read("sources.json"), claims: read("claims.json"), assessments: read("claim-assessments.json"),
  claimSources: read("claim-sources.json"), repetitions: read("claim-repetitions.json"), corrections: read("corrections.json"),
  integrity: read("integrity-matters.json"), conduct: read("conduct-matters.json"), responses: read("responses.json"), issues: read("issues.json"),
  updates: read("daily-updates.json"), changeLog: read("change-log.json"),
};
const upsert = (rows, row) => { const i = rows.findIndex((r) => r.id === row.id); if (i >= 0) rows[i] = { ...rows[i], ...row, createdAt: rows[i].createdAt }; else rows.push(row); };
const politicianBySlug = new Map(db.politicians.map((p) => [p.slug, p]));
const issueBySlug = new Map(db.issues.map((i) => [i.slug, i]));

/* ---------------- sources ---------------- */
function classify(url, publisher = "", hint = "") {
  const u = url.toLowerCase();
  const pub = publisher.toLowerCase();
  const is = (...hosts) => hosts.some((h) => u.includes(h));
  if (hint === "hansard" || is("parlinfo.aph.gov.au")) return [1, "hansard"];
  if (is("hcourt.gov.au", "austlii.edu.au", "fedcourt.gov.au", "judgments.fedcourt", "caselaw")) return [1, "court_document"];
  if (is("anao.gov.au")) return [1, "official_report"];
  if (is("pmc.gov.au")) return [1, "official_report"];
  if (is("afp.gov.au", "police.")) return [1, "police_statement"];
  if (is("nacc.gov.au", "ibac.", "icac.", "ccc.qld")) return [1, "integrity_body"];
  if (is("aec.gov.au", "ecq.qld.gov.au")) return [1, "official_statement"];
  if (is("abs.gov.au", "rba.gov.au/statistics", "data.gov.au")) return [1, "dataset"];
  if (is("aph.gov.au")) return [1, "parliamentary_document"];
  if (is("legislation.gov.au")) return [1, "legislation"];
  if (is(".gov.au", "pm.gov.au")) return [1, hint === "transcript" ? "transcript" : hint === "media_release" ? "media_release" : "official_report"];
  if (is("aap.com.au/factcheck", "factcheck", "factlab", "rmit.edu.au")) return [2, "fact_check"];
  if (is("abc.net.au", "sbs.com.au", "theconversation.com", "reuters.com", "aap.com.au")) return [2, "news_report"];
  if (is("x.com", "twitter.com", "facebook.com", "youtube.com", "instagram.com")) return [1, "transcript"]; // the politician's own published statement
  if (/liberal\.org\.au|alp\.org\.au|nationals\.org\.au|greens\.org\.au|onenation\.org\.au|\.com\.au\/media|media-release/.test(u)) return [1, "media_release"];
  if (pub.includes("fact")) return [2, "fact_check"];
  return [3, "other"];
}
function sourceId(url) {
  const u = new URL(url);
  const slug = (u.hostname.replace(/^www\./, "") + u.pathname).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
  return `src_${slug}-${crypto.createHash("sha1").update(url).digest("hex").slice(0, 6)}`;
}
function ensureSource(s, hint) {
  const id = sourceId(s.url);
  const [tier, kind] = classify(s.url, s.publisher, s.kind ?? hint);
  const row = { id, title: s.title, publisher: s.publisher, url: s.url, tier: s.tier ?? tier, kind: s.kind ?? kind, accessedAt: RUN_DATE, note: s.whatItShows ?? s.note, isDemonstration: false, createdAt: NOW, updatedAt: NOW };
  if (s.publishedAt) row.publishedAt = s.publishedAt;
  if (!row.note) delete row.note;
  upsert(db.sources, row);
  return id;
}

/* ---------------- claims ---------------- */
const VERDICT = [
  [/^(true|correct|checks out|accurate)/i, "supported"],
  [/^(mostly true|largely true|in the ballpark|mostly accurate|broadly correct)/i, "mostly_supported"],
  [/^(misleading|missing context|needs context|mixed|half true|partly|overreach|exaggerat|cherry|out of context|unproven)/i, "mixed"],
  [/^(false|wrong|mostly false|incorrect|doesn't stack up|not true|baseless|no evidence|fabricated|wildly)/i, "contradicted"],
  [/^(unverifiable|cannot be verified)/i, "unverifiable"],
  [/^(insufficient|inconclusive)/i, "insufficient"],
];
function mapVerdict(v) { for (const [re, s] of VERDICT) if (re.test(v.trim())) return s; return "mixed"; }

const touched = new Set();
// Update IDs derive from the record they describe, so re-running the ingestion is idempotent.
const addUpdate = (type, title, summary, relatedType, relatedId, politicianId) => {
  upsert(db.updates, { id: `upd_${RUN_DATE}-${relatedId.replace(/^[a-z]+_/, "")}`, date: RUN_DATE, type, title, summary, relatedType, relatedId, politicianId, createdAt: NOW, updatedAt: NOW });
};
const addChange = (recordType, recordId, politicianId, summary, reason) => {
  upsert(db.changeLog, { id: `chg_${recordId}-created`, date: RUN_DATE, kind: "record_created", recordType, recordId, politicianId, summary, reason, createdAt: NOW, updatedAt: NOW });
};

const claimsIn = readAll("claims").flat();
const perPolDate = new Map();
for (const c of claimsIn) {
  const pol = politicianBySlug.get(c.politicianSlug);
  if (!pol) throw new Error(`unknown politician ${c.politicianSlug}`);
  const key = `${pol.slug}-${c.statementDate}`;
  const n = (perPolDate.get(key) ?? 0) + 1;
  perPolDate.set(key, n);
  const claimId = `clm_${pol.slug}-${c.statementDate.replace(/-/g, "")}-${n}`;
  const asmId = `asm_${claimId.slice(4)}-v1`;
  const status = c.status ?? mapVerdict(c.factCheck.verdictAsPublished);
  const originalSourceId = c.originalSource ? ensureSource(c.originalSource, "transcript") : ensureSource({ title: c.factCheck.title, publisher: c.factCheck.publisher, url: c.factCheck.url, publishedAt: c.factCheck.publishedAt, note: "Records the statement as quoted by the fact-checker." }, "fact_check");
  const issueIds = (c.topics ?? []).map((t) => issueBySlug.get(t)?.id).filter(Boolean);
  upsert(db.claims, { id: claimId, politicianId: pol.id, quote: c.quote, summary: c.summary ?? c.quote, date: c.statementDate, ...(c.datePrecision && c.datePrecision !== "day" ? { datePrecision: c.datePrecision } : {}), context: c.statementContext, issueIds, originalSourceId, checkable: status !== "not_checkable", currentAssessmentId: asmId, isDemonstration: false, createdAt: NOW, updatedAt: NOW });
  const asm = { id: asmId, claimId, version: 1, status, findings: c.findings, reviewedAt: RUN_DATE, reviewedBy: "ai_draft", createdAt: NOW, updatedAt: NOW };
  if (c.context) asm.context = c.context;
  upsert(db.assessments, asm);
  // Claim sources: original, primary (official sources the fact-check relied on), independent (the fact-check itself), contradictory (flagged)
  db.claimSources = db.claimSources.filter((cs) => cs.claimId !== claimId);
  const link = (sourceIdValue, role, note, i) => db.claimSources.push({ id: `cs_${claimId}-${role}-${i}`, claimId, sourceId: sourceIdValue, role, ...(note ? { note } : {}), createdAt: NOW, updatedAt: NOW });
  link(originalSourceId, "original", undefined, 1);
  (c.primarySources ?? []).forEach((s, i) => link(ensureSource(s), "primary", s.whatItShows, i + 1));
  link(ensureSource({ title: c.factCheck.title, publisher: c.factCheck.publisher, url: c.factCheck.url, publishedAt: c.factCheck.publishedAt, note: `Verdict as published: ${c.factCheck.verdictAsPublished}.` }, "fact_check"), "independent", `Verdict as published: ${c.factCheck.verdictAsPublished}.`, 1);
  (c.contradictorySources ?? []).forEach((s, i) => link(ensureSource(s), "contradictory", s.whatItShows, i + 1));
  // Repetitions
  db.repetitions = db.repetitions.filter((r) => r.claimId !== claimId);
  (c.repeated ?? []).forEach((r, i) => db.repetitions.push({ id: `rep_${claimId}-${i + 1}`, claimId, date: r.date, context: r.context ?? "Repeated", ...(r.source ? { sourceId: ensureSource(r.source) } : {}), reworded: Boolean(r.reworded), evidenceChanged: false, createdAt: NOW, updatedAt: NOW }));
  // Correction behaviour and response
  db.corrections = db.corrections.filter((x) => x.claimId !== claimId);
  const corr = c.correction ?? { status: "no_correction_located", description: `PUBLIC RECORD has not located any correction, clarification or restatement of this claim as at ${RUN_DATE}.` };
  db.corrections.push({ id: `cor_${claimId}`, claimId, politicianId: pol.id, status: corr.status, ...(corr.date ? { date: corr.date } : {}), description: corr.description, ...(corr.source ? { sourceId: ensureSource(corr.source) } : {}), createdAt: NOW, updatedAt: NOW });
  db.responses = db.responses.filter((r) => !(r.relatedType === "claim" && r.relatedId === claimId));
  if (c.politicianResponse) {
    const r = c.politicianResponse;
    db.responses.push({ id: `rsp_${claimId}`, politicianId: pol.id, relatedType: "claim", relatedId: claimId, date: r.date ?? c.factCheck.publishedAt, kind: r.kind ?? "statement", summary: r.summary, ...(r.quote ? { quote: r.quote } : {}), ...(r.source ? { sourceId: ensureSource(r.source) } : {}), createdAt: NOW, updatedAt: NOW });
  }
  addUpdate("new_claim", `New claim: ${pol.fullName} — “${(c.summary ?? c.quote).slice(0, 90)}${(c.summary ?? c.quote).length > 90 ? "…" : ""}”`, `${c.statementContext}, ${c.statementDate}. Classified ${status.replace(/_/g, " ")} from the published fact-check and the official sources it cites. AI draft pending editorial review.`, "claim", claimId, pol.id);
  addChange("claim", claimId, pol.id, "Claim record created from a published fact-check and its cited sources.", `Entered on ${RUN_DATE}; drafted by AI; awaiting editorial sign-off.`);
  touched.add(pol.id);
}

/* ---------------- careers, integrity, conduct ---------------- */
const records = readAll("records").reduce((acc, r) => ({ careers: [...acc.careers, ...(r.careers ?? [])], integrityMatters: [...acc.integrityMatters, ...(r.integrityMatters ?? [])], conductMatters: [...acc.conductMatters, ...(r.conductMatters ?? [])] }), { careers: [], integrityMatters: [], conductMatters: [] });
for (const c of records.careers ?? []) {
  const pol = politicianBySlug.get(c.politicianSlug);
  if (!pol) throw new Error(`unknown politician ${c.politicianSlug}`);
  if (c.parliamentaryService) pol.parliamentaryService = c.parliamentaryService;
  if (c.positionsHeld) pol.career = c.positionsHeld.map((p) => ({ title: p.title, type: p.type, ...(p.from ? { from: p.from } : {}), ...(p.to ? { to: p.to } : {}) }));
  if (c.currentCommittees) pol.committees = c.currentCommittees;
  pol.updatedAt = NOW;
  touched.add(pol.id);
}
// Matter IDs are numbered per politician and year in input order, so they are stable across re-runs.
const matterSeq = new Map();
function ingestMatter(kind, m) {
  const pol = politicianBySlug.get(m.politicianSlug);
  if (!pol) throw new Error(`unknown politician ${m.politicianSlug}`);
  const list = kind === "integrity" ? db.integrity : db.conduct;
  const seqKey = `${kind}:${pol.slug}:${m.date.slice(0, 4)}`;
  const n = (matterSeq.get(seqKey) ?? 0) + 1;
  matterSeq.set(seqKey, n);
  const id = m.id ?? `${kind === "integrity" ? "int" : "cnd"}_${pol.slug}-${m.date.slice(0, 4)}-${n}`;
  const primary = (m.primarySources ?? []).map((s) => ensureSource(s));
  const independent = (m.independentSources ?? []).map((s) => ensureSource(s));
  let responseId;
  if (m.politicianResponse) {
    responseId = `rsp_${id}`;
    const r = m.politicianResponse;
    upsert(db.responses, { id: responseId, politicianId: pol.id, relatedType: kind, relatedId: id, date: r.date ?? m.date, kind: r.kind ?? "statement", summary: r.summary, ...(r.quote ? { quote: r.quote } : {}), ...(r.source ? { sourceId: ensureSource(r.source) } : {}), createdAt: NOW, updatedAt: NOW });
  }
  const row = { id, title: m.title, politicianId: pol.id, date: m.date, status: m.status, statusHistory: (m.statusHistory ?? []).map((h) => ({ status: h.status, date: h.date, ...(h.note ? { note: h.note } : {}), ...(h.source ? { sourceId: ensureSource(h.source) } : {}) })), primarySourceIds: primary, independentSourceIds: independent, ...(responseId ? { responseId } : {}), ...(m.outcome ? { outcome: m.outcome } : {}), lastCheckedAt: RUN_DATE, reviewedBy: "ai_draft", isDemonstration: false, createdAt: NOW, updatedAt: NOW };
  if (kind === "integrity") { row.organisation = m.organisation; row.description = m.description; }
  else { row.allegationSummary = m.allegationSummary; row.evidenceBasis = m.evidenceBasis ?? "official_record"; }
  upsert(list, row);
  addUpdate(kind === "integrity" ? (["cleared", "no_finding", "dismissed", "official_finding", "convicted", "overturned_appealed"].includes(m.status) ? "investigation_closed" : "investigation_opened") : "conduct_update", `${kind === "integrity" ? "Integrity record" : "Conduct record"}: ${m.title}`, `${m.organisation ?? ""} ${m.outcome ? `Outcome: ${m.outcome.slice(0, 140)}` : `Status: ${m.status.replace(/_/g, " ")}`}`.trim() + " AI draft pending editorial review.", kind, id, pol.id);
  addChange(kind, id, pol.id, `${kind === "integrity" ? "Integrity" : "Conduct"} record created from official records.`, `Entered on ${RUN_DATE}; drafted by AI; awaiting editorial sign-off.`);
  touched.add(pol.id);
}
for (const m of records.integrityMatters ?? []) ingestMatter("integrity", m);
for (const m of records.conductMatters ?? []) ingestMatter("conduct", m);

for (const id of touched) { const p = db.politicians.find((x) => x.id === id); p.lastRecordUpdate = RUN_DATE; p.updatedAt = NOW; }

write("politicians.json", db.politicians); write("sources.json", db.sources); write("claims.json", db.claims); write("claim-assessments.json", db.assessments);
write("claim-sources.json", db.claimSources); write("claim-repetitions.json", db.repetitions); write("corrections.json", db.corrections);
write("integrity-matters.json", db.integrity); write("conduct-matters.json", db.conduct); write("responses.json", db.responses);
write("daily-updates.json", db.updates); write("change-log.json", db.changeLog);
console.log({ claims: claimsIn.length, careers: (records.careers ?? []).length, integrity: (records.integrityMatters ?? []).length, conduct: (records.conductMatters ?? []).length, politiciansTouched: touched.size, sources: db.sources.length });
