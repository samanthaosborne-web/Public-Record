#!/usr/bin/env node
/**
 * Editorial review for AI-drafted records.
 *
 * Reads the decisions a human has written into review/REVIEW.md, applies them to
 * the data files, records them in review/decisions-log.json, and regenerates the
 * sheet so that it always lists exactly the records still awaiting review.
 *
 *   approve              publish the record as human-reviewed
 *   approve as <status>  publish a claim with a different evidence status
 *   reject               withdraw the record from the site
 *   hold / pending       leave it as a draft (notes are kept)
 *
 * Usage: node scripts/apply-review.cjs [--data src/data] [--sheet review/REVIEW.md]
 *          [--log review/decisions-log.json] [--site <live site url>] [--date YYYY-MM-DD]
 * Re-running with no new decisions changes nothing.
 */
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const DATA = path.resolve(opt("--data", "src/data"));
const SHEET = path.resolve(opt("--sheet", "review/REVIEW.md"));
const LOG = path.resolve(opt("--log", "review/decisions-log.json"));
const SITE = opt("--site", process.env.PUBLIC_RECORD_SITE_URL || "https://samanthaosborne-web.github.io/Public-Record").replace(/\/$/, "");
const TODAY = opt("--date", new Date().toISOString().slice(0, 10));
const NOW = `${TODAY}T09:00:00+10:00`;

const read = (name) => JSON.parse(fs.readFileSync(path.join(DATA, name), "utf8"));
const write = (name, rows) => fs.writeFileSync(path.join(DATA, name), JSON.stringify(rows, null, 2) + "\n");
const db = {
  politicians: read("politicians.json"), sources: read("sources.json"), claims: read("claims.json"), assessments: read("claim-assessments.json"),
  claimSources: read("claim-sources.json"), repetitions: read("claim-repetitions.json"), corrections: read("corrections.json"),
  integrity: read("integrity-matters.json"), conduct: read("conduct-matters.json"), responses: read("responses.json"),
  updates: read("daily-updates.json"), changeLog: read("change-log.json"),
};
const politician = new Map(db.politicians.map((p) => [p.id, p]));
const log = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, "utf8")) : [];
const applied = new Map(log.map((e) => [e.id, e]));

const EVIDENCE = {
  supported: "Supported", mostly_supported: "Mostly supported", mixed: "Mixed / context required", contradicted: "Contradicted by evidence",
  insufficient: "Insufficient evidence", unverifiable: "Unverifiable", not_checkable: "Opinion / prediction, not fact-checkable",
};
const STATUS_WORDS = {
  "supported": "supported", "mostly supported": "mostly_supported", "mixed": "mixed", "mixed context required": "mixed", "context required": "mixed",
  "contradicted": "contradicted", "contradicted by evidence": "contradicted", "insufficient": "insufficient", "insufficient evidence": "insufficient",
  "unverifiable": "unverifiable", "not checkable": "not_checkable", "opinion": "not_checkable", "opinion prediction": "not_checkable", "not fact checkable": "not_checkable",
};
const humanise = (s) => s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (iso, precision) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (precision === "year") return String(y);
  if (precision === "month") return `${MONTHS[m - 1]} ${y}`;
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
const clip = (s, n = 150) => { const t = String(s ?? "").replace(/\s+/g, " ").replace(/\|/g, "/").trim(); return t.length > n ? `${t.slice(0, n - 1).trim()}…` : t; };

/* ---------------- parse the sheet ---------------- */
function parseDecision(cell) {
  const c = cell.trim().toLowerCase().replace(/\s+/g, " ");
  if (!c || c === "pending" || c === "-" || c === "—") return { kind: "pending" };
  if (c === "hold" || c.startsWith("hold ")) return { kind: "hold" };
  if (/^[✓✗]/.test(c) || /^(approved|rejected|withdrawn)\s+\S/.test(c)) return { kind: "applied" };
  let m = c.match(/^(approve|approved|publish|yes)(?:\s+as\s+(.+))?$/);
  if (m) {
    if (!m[2]) return { kind: "approve" };
    const key = m[2].replace(/[^a-z]+/g, " ").trim();
    const status = STATUS_WORDS[key] ?? (EVIDENCE[key.replace(/ /g, "_")] ? key.replace(/ /g, "_") : null);
    return status ? { kind: "approve", status } : { kind: "invalid" };
  }
  if (/^(reject|rejected|remove|withdraw|no)$/.test(c)) return { kind: "reject" };
  return { kind: "invalid" };
}
const sheetRows = new Map();
if (fs.existsSync(SHEET)) {
  for (const line of fs.readFileSync(SHEET, "utf8").split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    let cells = line.split("|").slice(1);
    if (cells.length && !cells[cells.length - 1].trim()) cells = cells.slice(0, -1);
    cells = cells.map((s) => s.trim());
    const id = (cells[0] ?? "").replace(/`/g, "").trim();
    if (!/^(clm|int|cnd)_/.test(id) || cells.length < 3) continue;
    sheetRows.set(id, { raw: cells[2] ?? "", note: (cells[3] ?? "").trim(), decision: parseDecision(cells[2] ?? "") });
  }
}

/* ---------------- apply decisions ---------------- */
const addChange = (recordType, recordId, politicianId, kind, summary, reason) =>
  db.changeLog.push({ id: `chg_${recordId}-${kind}-${TODAY}`, date: TODAY, kind, recordType, recordId, politicianId, summary, reason, createdAt: NOW, updatedAt: NOW });
const describeClaim = (c) => `${politician.get(c.politicianId)?.fullName ?? c.politicianId} · Claim · ${fmtDate(c.date, c.datePrecision)} — “${clip(c.summary ?? c.quote, 110)}”`;
const describeMatter = (m, type) => `${politician.get(m.politicianId)?.fullName ?? m.politicianId} · ${type === "integrity" ? "Integrity matter" : "Serious conduct matter"} — ${clip(m.title, 120)}`;

const results = [];
for (const [id, row] of sheetRows) {
  const { decision, note } = row;
  if (applied.has(id) || decision.kind === "pending" || decision.kind === "hold" || decision.kind === "applied") continue;
  if (decision.kind === "invalid") { results.push(`! ${id}: could not read the decision "${row.raw}" (use approve, approve as <status>, reject or hold); left pending`); continue; }
  const kind = id.startsWith("clm_") ? "claim" : id.startsWith("int_") ? "integrity" : "conduct";
  const entry = { id, type: kind, decision: decision.kind, note, appliedAt: TODAY };
  if (kind === "claim") {
    const claim = db.claims.find((c) => c.id === id);
    if (!claim) { results.push(`! ${id}: no such claim`); continue; }
    entry.politician = politician.get(claim.politicianId)?.fullName; entry.record = describeClaim(claim);
    const asm = db.assessments.find((a) => a.id === claim.currentAssessmentId);
    if (decision.kind === "approve") {
      if (decision.status && asm && decision.status !== asm.status) {
        const from = asm.status; asm.status = decision.status; claim.checkable = decision.status !== "not_checkable"; entry.status = decision.status; entry.previousStatus = from;
        addChange("claim", id, claim.politicianId, "classification_changed", `Evidence status changed from ${EVIDENCE[from]} to ${EVIDENCE[decision.status]} at editorial review.`, note || "Editorial review.");
      }
      if (asm) { asm.reviewedBy = "human"; asm.reviewedAt = TODAY; asm.updatedAt = NOW; }
      claim.updatedAt = NOW;
      addChange("claim", id, claim.politicianId, "record_amended", "Approved for publication after editorial review.", note || "Human review completed.");
    } else {
      db.claims = db.claims.filter((c) => c.id !== id);
      db.assessments = db.assessments.filter((a) => a.claimId !== id);
      db.claimSources = db.claimSources.filter((s) => s.claimId !== id);
      db.repetitions = db.repetitions.filter((r) => r.claimId !== id);
      db.corrections = db.corrections.filter((c) => c.claimId !== id);
      db.responses = db.responses.filter((r) => !(r.relatedType === "claim" && r.relatedId === id));
      db.updates = db.updates.filter((u) => !(u.relatedType === "claim" && u.relatedId === id));
      addChange("claim", id, claim.politicianId, "record_withdrawn", "Draft claim record withdrawn at editorial review and not published.", note || "Editorial review.");
    }
  } else {
    const list = kind === "integrity" ? db.integrity : db.conduct;
    const matter = list.find((m) => m.id === id);
    if (!matter) { results.push(`! ${id}: no such ${kind} record`); continue; }
    entry.politician = politician.get(matter.politicianId)?.fullName; entry.record = describeMatter(matter, kind);
    if (decision.kind === "approve") {
      matter.reviewedBy = "human"; matter.humanReviewedAt = TODAY; matter.lastCheckedAt = TODAY; matter.updatedAt = NOW;
      addChange(kind, id, matter.politicianId, "record_amended", "Approved for publication after editorial review.", note || "Human review completed.");
    } else {
      if (kind === "integrity") db.integrity = db.integrity.filter((m) => m.id !== id); else db.conduct = db.conduct.filter((m) => m.id !== id);
      db.responses = db.responses.filter((r) => !(r.relatedType === kind && r.relatedId === id));
      db.updates = db.updates.filter((u) => !(u.relatedType === kind && u.relatedId === id));
      addChange(kind, id, matter.politicianId, "record_withdrawn", `Draft ${kind === "integrity" ? "integrity" : "conduct"} record withdrawn at editorial review and not published.`, note || "Editorial review.");
    }
  }
  log.push(entry); applied.set(id, entry);
  results.push(`${decision.kind === "approve" ? "✓" : "✗"} ${id}: ${decision.kind}${entry.status ? ` as ${entry.status}` : ""}`);
}

/* Remove sources that nothing references any more (ingested ones only). */
const referenced = new Set();
for (const [name, rows] of Object.entries(db)) { if (name === "sources") continue; for (const m of JSON.stringify(rows).matchAll(/src_[a-z0-9._-]+/g)) referenced.add(m[0]); }
db.sources = db.sources.filter((s) => s.isDemonstration || referenced.has(s.id));

/* ---------------- regenerate the sheet ---------------- */
const pending = [];
for (const c of db.claims) { const a = db.assessments.find((x) => x.id === c.currentAssessmentId); if (a?.reviewedBy === "ai_draft") pending.push({ id: c.id, politicianId: c.politicianId, text: `Claim · ${fmtDate(c.date, c.datePrecision)} · *${EVIDENCE[a.status]}* — “${clip(c.quote, 160)}” · [view](${SITE}/claims/${c.id}/)` }); }
for (const m of db.integrity) if (m.reviewedBy === "ai_draft") pending.push({ id: m.id, politicianId: m.politicianId, text: `Integrity matter · *${humanise(m.status)}* — ${clip(m.title, 160)} · [view](${SITE}/integrity/${m.id}/)` });
for (const m of db.conduct) if (m.reviewedBy === "ai_draft") pending.push({ id: m.id, politicianId: m.politicianId, text: `Serious conduct matter · *${humanise(m.status)}* — ${clip(m.title, 160)} · [view](${SITE}/conduct/${m.id}/)` });
const order = new Map(db.politicians.map((p, i) => [p.id, i]));
pending.sort((a, b) => (order.get(a.politicianId) - order.get(b.politicianId)) || a.id.localeCompare(b.id));

const lines = [];
lines.push("# PUBLIC RECORD editorial review", "",
  "Records drafted by the automated pipeline stay labelled **AI draft · pending editorial review** on the site until a person approves them here. Each row links to the record's page on the live site, where the full evidence panel, sources and the politician's response are shown.", "",
  "## How to review", "",
  "1. Open a record's **view** link and check the statement, the evidence and the sources.",
  "2. Edit this file (the pencil icon on GitHub) and change its **Decision** cell to one of:",
  "   - `approve` — publish the record as human-reviewed;",
  "   - `approve as mixed` — publish a claim with a different evidence status (statuses: supported, mostly supported, mixed, contradicted, insufficient, unverifiable, not checkable);",
  "   - `reject` — withdraw the record from the site;",
  "   - `hold` — leave it as a draft; use the Note column to say what is missing.",
  "3. Add a short note if you want (avoid the `|` character), then commit the change to this branch.",
  "", "The site rebuilds itself within a few minutes, the decisions are applied to the data files and this sheet is regenerated. Decisions are also recorded in `review/decisions-log.json` and in the site's corrections log. Anything that cannot be read is left pending and reported in the build log.", "");
lines.push(`## Pending review (${pending.length} record${pending.length === 1 ? "" : "s"})`, "");
if (!pending.length) lines.push("Nothing is waiting for review.", "");
let current = null;
for (const p of pending) {
  if (p.politicianId !== current) {
    current = p.politicianId; const count = pending.filter((x) => x.politicianId === current).length;
    lines.push(`### ${politician.get(current)?.fullName ?? current} (${count})`, "", "| ID | Record | Decision | Note |", "|---|---|---|---|");
  }
  const prev = sheetRows.get(p.id);
  const keep = prev && (prev.decision.kind === "hold" || prev.decision.kind === "invalid") ? prev.raw : "pending";
  lines.push(`| \`${p.id}\` | ${p.text} | ${keep} | ${prev?.note ?? ""} |`);
  if (pending[pending.indexOf(p) + 1]?.politicianId !== current) lines.push("");
}
lines.push(`## Applied decisions (${log.length})`, "");
if (!log.length) lines.push("No decisions have been applied yet.", "");
else {
  lines.push("| ID | Record | Decision | Note |", "|---|---|---|---|");
  for (const e of [...log].sort((a, b) => b.appliedAt.localeCompare(a.appliedAt) || a.id.localeCompare(b.id)))
    lines.push(`| \`${e.id}\` | ${clip(e.record, 170)} | ${e.decision === "approve" ? "✓ approved" : "✗ rejected"}${e.status ? ` as ${e.status}` : ""} ${e.appliedAt} | ${clip(e.note, 120)} |`);
  lines.push("");
}
fs.mkdirSync(path.dirname(SHEET), { recursive: true });
fs.writeFileSync(SHEET, lines.join("\n"));
fs.writeFileSync(LOG, JSON.stringify(log, null, 2) + "\n");

write("politicians.json", db.politicians); write("sources.json", db.sources); write("claims.json", db.claims); write("claim-assessments.json", db.assessments);
write("claim-sources.json", db.claimSources); write("claim-repetitions.json", db.repetitions); write("corrections.json", db.corrections);
write("integrity-matters.json", db.integrity); write("conduct-matters.json", db.conduct); write("responses.json", db.responses);
write("daily-updates.json", db.updates); write("change-log.json", db.changeLog);

for (const r of results) console.log(r);
console.log(`${results.filter((r) => !r.startsWith("!")).length} decision(s) applied; ${pending.length} record(s) still pending; ${log.length} applied in total.`);
