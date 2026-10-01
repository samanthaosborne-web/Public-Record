/**
 * Validates referential integrity of the JSON database.
 * Run: node scripts/validate-data.cjs
 */
const fs = require("fs");
const path = require("path");
const DATA = path.join(__dirname, "..", "src", "data");
const load = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));
const d = {
  parties: load("parties.json"), politicians: load("politicians.json"), sources: load("sources.json"), claims: load("claims.json"),
  assessments: load("claim-assessments.json"), claimSources: load("claim-sources.json"), repetitions: load("claim-repetitions.json"),
  corrections: load("corrections.json"), integrity: load("integrity-matters.json"), conduct: load("conduct-matters.json"),
  responses: load("responses.json"), issues: load("issues.json"), updates: load("daily-updates.json"), review: load("review-queue.json"), changeLog: load("change-log.json"),
};
const errors = [];
const ids = (rows, name) => { const s = new Set(); for (const r of rows) { if (!r.id) errors.push(`${name}: missing id`); if (s.has(r.id)) errors.push(`${name}: duplicate id ${r.id}`); s.add(r.id); if (!r.createdAt || !r.updatedAt) errors.push(`${name} ${r.id}: missing timestamps`); } return s; };
const P = ids(d.parties, "parties"), POL = ids(d.politicians, "politicians"), S = ids(d.sources, "sources"), CL = ids(d.claims, "claims"), A = ids(d.assessments, "assessments");
ids(d.claimSources, "claimSources"); ids(d.repetitions, "repetitions"); ids(d.corrections, "corrections"); const INT = ids(d.integrity, "integrity"); const CND = ids(d.conduct, "conduct");
const R = ids(d.responses, "responses"); const I = ids(d.issues, "issues"); ids(d.updates, "updates"); ids(d.review, "review"); ids(d.changeLog, "changeLog");
const slugs = new Set();
for (const p of d.politicians) { if (!P.has(p.partyId)) errors.push(`politician ${p.id}: unknown party ${p.partyId}`); if (slugs.has(p.slug)) errors.push(`duplicate slug ${p.slug}`); slugs.add(p.slug); for (const s of p.verification.sourceIds) if (!S.has(s)) errors.push(`politician ${p.id}: unknown verification source ${s}`); if (p.chamber === "house" && !p.electorate) errors.push(`politician ${p.id}: house member without electorate`); }
for (const c of d.claims) { if (!POL.has(c.politicianId)) errors.push(`claim ${c.id}: unknown politician`); if (!S.has(c.originalSourceId)) errors.push(`claim ${c.id}: unknown original source`); if (!A.has(c.currentAssessmentId)) errors.push(`claim ${c.id}: unknown assessment ${c.currentAssessmentId}`); for (const i of c.issueIds) if (!I.has(i)) errors.push(`claim ${c.id}: unknown issue ${i}`); if (c.repeatsClaimId && !CL.has(c.repeatsClaimId)) errors.push(`claim ${c.id}: unknown repeatsClaimId`); }
for (const a of d.assessments) { if (!CL.has(a.claimId)) errors.push(`assessment ${a.id}: unknown claim`); if (a.supersedesAssessmentId && !A.has(a.supersedesAssessmentId)) errors.push(`assessment ${a.id}: unknown supersedes`); }
for (const cs of d.claimSources) { if (!CL.has(cs.claimId)) errors.push(`claimSource ${cs.id}: unknown claim`); if (!S.has(cs.sourceId)) errors.push(`claimSource ${cs.id}: unknown source ${cs.sourceId}`); }
for (const r of d.repetitions) { if (!CL.has(r.claimId)) errors.push(`repetition ${r.id}: unknown claim`); if (r.sourceId && !S.has(r.sourceId)) errors.push(`repetition ${r.id}: unknown source`); }
for (const c of d.corrections) { if (!CL.has(c.claimId)) errors.push(`correction ${c.id}: unknown claim`); if (!POL.has(c.politicianId)) errors.push(`correction ${c.id}: unknown politician`); if (c.sourceId && !S.has(c.sourceId)) errors.push(`correction ${c.id}: unknown source`); }
for (const m of [...d.integrity, ...d.conduct]) { if (!POL.has(m.politicianId)) errors.push(`matter ${m.id}: unknown politician`); for (const s of [...m.primarySourceIds, ...m.independentSourceIds]) if (!S.has(s)) errors.push(`matter ${m.id}: unknown source ${s}`); if (m.responseId && !R.has(m.responseId)) errors.push(`matter ${m.id}: unknown response`); for (const h of m.statusHistory) if (h.sourceId && !S.has(h.sourceId)) errors.push(`matter ${m.id}: unknown history source ${h.sourceId}`); if (m.reviewedBy !== "human" && m.reviewedBy !== "ai_draft") errors.push(`matter ${m.id}: reviewedBy must be human or ai_draft`); if (m.reviewedBy === "human" && !m.humanReviewedAt) errors.push(`matter ${m.id}: human review requires humanReviewedAt`); }
for (const r of d.responses) { if (!POL.has(r.politicianId)) errors.push(`response ${r.id}: unknown politician`); const ok = r.relatedType === "claim" ? CL.has(r.relatedId) : r.relatedType === "integrity" ? INT.has(r.relatedId) : r.relatedType === "conduct" ? CND.has(r.relatedId) : POL.has(r.relatedId); if (!ok) errors.push(`response ${r.id}: unknown related ${r.relatedType} ${r.relatedId}`); if (r.sourceId && !S.has(r.sourceId)) errors.push(`response ${r.id}: unknown source`); }
for (const u of d.updates) { const ok = u.relatedType === "claim" ? CL.has(u.relatedId) : u.relatedType === "integrity" ? INT.has(u.relatedId) : u.relatedType === "conduct" ? CND.has(u.relatedId) : POL.has(u.relatedId); if (!ok) errors.push(`update ${u.id}: unknown related ${u.relatedType} ${u.relatedId}`); if (u.politicianId && !POL.has(u.politicianId)) errors.push(`update ${u.id}: unknown politician`); }
for (const c of d.changeLog) { if (c.politicianId && !POL.has(c.politicianId)) errors.push(`change ${c.id}: unknown politician`); }
for (const r of d.review) { if (r.politicianId && !POL.has(r.politicianId)) errors.push(`review ${r.id}: unknown politician`); if ((r.targetType === "integrity" || r.targetType === "conduct") && !r.requiresHumanReview) errors.push(`review ${r.id}: serious matter must require human review`); for (const s of r.similarClaims) if (!CL.has(s.claimId)) errors.push(`review ${r.id}: unknown similar claim`); }
// Terminology guard: banned labels must never appear in published record text.
const banned = /\b(liar|liars|corrupt politician|criminal politician|sex offender)\b|(?<!\bno )(?<!\bnot )(?<!\bany )\bdishonest\b/i;
for (const [name, rows] of Object.entries(d)) for (const r of rows) for (const v of Object.values(r)) if (typeof v === "string" && banned.test(v)) errors.push(`${name} ${r.id}: banned term in text: "${v.slice(0, 60)}"`);
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`OK — ${Object.entries(d).map(([k, v]) => `${k}:${v.length}`).join(" ")}`);
