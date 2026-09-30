/**
 * Builds src/data/politicians.json from:
 *   1. verified research files for real politicians (research/*.json), and
 *   2. the fictional DEMONSTRATION profiles defined below.
 * It also appends the real verification sources to sources.json, a
 * "profile verified" entry per real politician to daily-updates.json, and
 * change-log entries for profiles whose office changed during 2026.
 *
 * Usage: node scripts/build-politicians.cjs <research-dir>
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const researchDir = process.argv[2];
if (!researchDir) throw new Error("research dir required");
const DATA = path.join(__dirname, "..", "src", "data");
const VERIFIED = "2026-09-30";
const T = "2026-09-30T09:00:00+10:00";

const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));
const write = (f, d) => fs.writeFileSync(path.join(DATA, f), JSON.stringify(d, null, 2) + "\n");

const sources = read("sources.json").filter((s) => s.isDemonstration);
const sourceByUrl = new Map();
function sourceIdFor(src) {
  if (sourceByUrl.has(src.url)) return sourceByUrl.get(src.url);
  const u = new URL(src.url);
  const slug = (u.hostname.replace(/^www\./, "") + u.pathname + u.search)
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
  const hash = crypto.createHash("sha1").update(src.url).digest("hex").slice(0, 6);
  const id = `src_${slug}-${hash}`;
  const kind = /aph\.gov\.au\/Senators_and_Members\/Parliamentarian/.test(src.url) ? "official_profile"
    : /aph\.gov\.au/.test(src.url) ? "parliamentary_document"
    : /aec\.gov\.au/.test(src.url) ? "official_statement"
    : /abc\.net\.au|sbs\.com\.au|theconversation\.com/.test(src.url) ? "news_report"
    : /greens\.org\.au|liberal\.org\.au|nationals\.org\.au|onenation\.org\.au/.test(src.url) && /media-release|news|\/20\d\d\//.test(src.url) ? "media_release"
    : "official_profile";
  const tier = /aph\.gov\.au|aec\.gov\.au|pm\.gov\.au|treasury\.gov\.au/.test(src.url) ? 1
    : /abc\.net\.au|sbs\.com\.au|theconversation\.com/.test(src.url) ? 2
    : 1; // party and ministerial sites: primary for a person's own office/positions
  const row = { id, title: src.title, publisher: src.publisher, url: src.url, tier, kind, accessedAt: VERIFIED, note: src.note, isDemonstration: false, createdAt: T, updatedAt: T };
  if (src.publishedAt) row.publishedAt = src.publishedAt;
  sources.push(row);
  sourceByUrl.set(src.url, id);
  return id;
}

const RANK = {
  "anthony-albanese": 1, "richard-marles": 2, "jim-chalmers": 3, "penny-wong": 4, "katy-gallagher": 5, "mark-butler": 6,
  "angus-taylor": 10, "jane-hume": 11, "michaelia-cash": 12, "james-paterson": 13, "andrew-hastie": 14,
  "matt-canavan": 20, "darren-chester": 21, "bridget-mckenzie": 22, "david-littleproud": 23,
  "david-shoebridge": 30, "steph-hodgins-may": 31, "sarah-hanson-young": 32, "nick-mckim": 33, "mehreen-faruqi": 34,
  "pauline-hanson": 40, "malcolm-roberts": 41, "david-farley": 42,
};

// Profiles whose office changed in 2026; used for the change log.
const CHANGES_2026 = {
  "angus-taylor": ["Shadow Minister for Defence", "Leader of the Opposition (from 13 February 2026)"],
  "jane-hume": ["Backbench senator", "Deputy Leader of the Opposition (from 13 February 2026)"],
  "michaelia-cash": ["Shadow Minister for Foreign Affairs", "Shadow Attorney-General (from 17 February 2026); remains Leader of the Opposition in the Senate"],
  "james-paterson": ["Shadow Minister for Finance", "Shadow Minister for Defence (from 17 February 2026)"],
  "andrew-hastie": ["Backbench member", "Shadow Minister for Industry and Sovereign Capability (from 17 February 2026)"],
  "matt-canavan": ["Backbench senator", "Leader of the Nationals (from 11 March 2026); Shadow Minister for Trade, Investment and Tourism (from 16 March 2026)"],
  "darren-chester": ["Shadow Minister for Veterans' Affairs", "Deputy Leader of the Nationals (from 11 March 2026); Shadow Minister for Agriculture, Fisheries and Forestry (from 16 March 2026)"],
  "bridget-mckenzie": ["Shadow Minister for Infrastructure, Transport and Regional Development", "Shadow Minister for Infrastructure and Transport; Shadow Minister for Regional Development, Local Government and Territories (from 16 March 2026)"],
  "david-littleproud": ["Leader of the Nationals", "Shadow Minister for Emergency Management; Shadow Minister for Tourism (from 16 March 2026)"],
  "david-shoebridge": ["Senator for New South Wales (Greens spokesperson roles)", "Leader of the Australian Greens (from 30 September 2026)"],
  "steph-hodgins-may": ["Senator for Victoria (Greens spokesperson roles)", "Deputy Leader of the Australian Greens (from 30 September 2026)"],
  "mehreen-faruqi": ["Deputy Leader of the Australian Greens", "Senator for New South Wales (from 30 September 2026)"],
  "david-farley": [null, "Member for Farrer (elected at the by-election of 9 May 2026)"],
};

const real = [];
for (const file of ["labor.json", "liberal.json", "nationals.json", "greens.json", "onenation.json"]) {
  for (const r of JSON.parse(fs.readFileSync(path.join(researchDir, file), "utf8"))) {
    const sourceIds = r.sources.map(sourceIdFor);
    const politician = {
      id: `pol_${r.familyName.toLowerCase().replace(/[^a-z]+/g, "-")}-${r.givenName.toLowerCase().replace(/[^a-z]+/g, "-")}`,
      slug: r.slug,
      fullName: r.fullName,
      givenName: r.givenName,
      familyName: r.familyName,
      sortName: `${r.familyName}, ${r.givenName}`,
      partyId: r.party,
      chamber: r.chamber,
      state: r.state,
      positions: r.positions.map((p) => ({ ...p, sourceId: sourceIds[0] })),
      positionSummary: r.positionSummary,
      positionRank: RANK[r.slug] ?? 50,
      aphId: r.aphId,
      aphProfileUrl: r.aphProfileUrl,
      photoUrl: `https://www.aph.gov.au/api/parliamentarian/${r.aphId}/image`,
      photoCredit: "Parliament of Australia",
      firstElected: r.firstElected,
      isDemonstration: false,
      verification: { verifiedAt: VERIFIED, sourceIds, notes: r.notes },
      lastRecordUpdate: VERIFIED,
      createdAt: T,
      updatedAt: T,
    };
    if (r.electorate) politician.electorate = r.electorate;
    if (r.officialWebsite) politician.officialWebsite = r.officialWebsite;
    if (r.partyNote) politician.partyNote = r.partyNote;
    if (r.aphDisplayName) politician.aphDisplayName = r.aphDisplayName;
    real.push(politician);
  }
}

const demoVerification = { verifiedAt: VERIFIED, sourceIds: ["src_demo-parliament-profiles"], notes: "Fictional politician created to demonstrate the record format. No real person is depicted." };
const demo = [
  { id: "pol_demo-vance-eleanor", slug: "eleanor-vance", fullName: "Eleanor Vance", givenName: "Eleanor", familyName: "Vance", partyId: "demo-harbour", chamber: "house", electorate: "Kestrel Bay", state: "NSW", positions: [{ title: "Minister for Regional Infrastructure", type: "executive", since: "2025-05-13" }, { title: "Member for Kestrel Bay", type: "parliamentary", since: "2019-05-18" }], positionSummary: "Minister for Regional Infrastructure", positionRank: 101, firstElected: 2019, lastRecordUpdate: "2026-09-30" },
  { id: "pol_demo-oyelaran-marcus", slug: "marcus-oyelaran", fullName: "Marcus Oyelaran", givenName: "Marcus", familyName: "Oyelaran", partyId: "demo-civic", chamber: "house", electorate: "Wattle Plains", state: "VIC", positions: [{ title: "Shadow Treasurer", type: "opposition", since: "2025-05-28" }, { title: "Member for Wattle Plains", type: "parliamentary", since: "2016-07-02" }], positionSummary: "Shadow Treasurer", positionRank: 102, firstElected: 2016, lastRecordUpdate: "2026-09-30" },
  { id: "pol_demo-natarajan-priya", slug: "priya-natarajan", fullName: "Priya Natarajan", givenName: "Priya", familyName: "Natarajan", partyId: "demo-harbour", chamber: "senate", state: "QLD", positions: [{ title: "Assistant Minister for Housing Supply", type: "executive", since: "2025-05-13" }, { title: "Senator for Queensland", type: "parliamentary", since: "2022-07-01" }], positionSummary: "Assistant Minister for Housing Supply", positionRank: 103, firstElected: 2022, lastRecordUpdate: "2026-09-30" },
  { id: "pol_demo-brackenridge-tom", slug: "tom-brackenridge", fullName: "Tom Brackenridge", givenName: "Tom", familyName: "Brackenridge", partyId: "demo-civic", chamber: "house", electorate: "Ironbark", state: "WA", positions: [{ title: "Shadow Minister for Energy", type: "opposition", since: "2025-05-28" }, { title: "Member for Ironbark", type: "parliamentary", since: "2019-05-18" }], positionSummary: "Shadow Minister for Energy", positionRank: 104, firstElected: 2019, lastRecordUpdate: "2026-09-29" },
  { id: "pol_demo-fenwick-isla", slug: "isla-fenwick", fullName: "Isla Fenwick", givenName: "Isla", familyName: "Fenwick", partyId: "demo-ind", chamber: "senate", state: "TAS", positions: [{ title: "Senator for Tasmania", type: "parliamentary", since: "2022-07-01" }], positionSummary: "Independent Senator for Tasmania", positionRank: 105, firstElected: 2022, lastRecordUpdate: "2026-09-29" },
  { id: "pol_demo-castellan-hugh", slug: "hugh-castellan", fullName: "Hugh Castellan", givenName: "Hugh", familyName: "Castellan", partyId: "demo-harbour", chamber: "house", electorate: "Silvergum", state: "SA", positions: [{ title: "Member for Silvergum", type: "backbench", since: "2022-05-21" }], positionSummary: "Member for Silvergum", positionRank: 106, firstElected: 2022, lastRecordUpdate: "2026-09-30" },
].map((p) => ({ ...p, sortName: `${p.familyName}, ${p.givenName}`, isDemonstration: true, verification: demoVerification, createdAt: T, updatedAt: T }));

write("politicians.json", [...real, ...demo]);
write("sources.json", sources);

// Daily feed: profile verified entries and change-log entries for real politicians.
const updates = read("daily-updates.json").filter((u) => u.type !== "profile_verified");
const changeLog = read("change-log.json").filter((c) => c.kind !== "profile_updated");
let seq = 100;
for (const p of real) {
  seq += 1;
  const change = CHANGES_2026[p.slug];
  updates.push({
    id: `upd_2026-09-30-${seq}`, date: "2026-09-30", type: "profile_verified",
    title: `Profile verified: ${p.fullName}`,
    summary: change
      ? `Name, party, seat and current office verified against Parliament of Australia records and recent reporting. Current office: ${p.positionSummary}. Office changed during 2026 (see the corrections log).`
      : `Name, party, seat and current office verified against Parliament of Australia records and recent reporting. Current office: ${p.positionSummary}.`,
    relatedType: "politician", relatedId: p.id, politicianId: p.id, createdAt: "2026-09-30T09:00:00+10:00", updatedAt: "2026-09-30T09:00:00+10:00",
  });
  if (change) {
    const [prev, next] = change;
    const row = { id: `chg_profile-${p.slug}`, date: "2026-09-30", kind: "profile_updated", recordType: "politician", recordId: p.id, politicianId: p.id,
      summary: prev ? `Current office updated to reflect a change during 2026.` : `Profile created for a member elected during 2026.`,
      newValue: next, reason: "Verified against Parliament of Australia records and recent reporting on 30 September 2026.", createdAt: T, updatedAt: T };
    if (prev) row.previousValue = prev;
    changeLog.push(row);
  }
}
write("daily-updates.json", updates);
write("change-log.json", changeLog);
console.log({ real: real.length, demo: demo.length, sources: sources.length, updates: updates.length, changeLog: changeLog.length });
