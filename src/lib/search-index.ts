/**
 * Search index for client-side search (used by the static copy of the site
 * and available to any client at /api/search-index). Each document carries
 * the fields needed to render a result card plus a pre-built `text` field
 * that mirrors what the server-side search engine matches against.
 */
import type { PublicRecordRepository } from "./data/repository";
import { CONDUCT_STATUS, EVIDENCE_STATUS, INTEGRITY_STATUS, type Tone } from "./labels";
import { formatDate, truncate } from "./format";

export type SearchDocType = "politician" | "claim" | "integrity" | "conduct" | "issue";

export interface SearchIndexDoc {
  type: SearchDocType;
  id: string;
  /** Site-root-relative path, e.g. "/claims/clm_0001". */
  href: string;
  title: string;
  subtitle?: string;
  excerpt?: string;
  status?: { label: string; tone: Tone; banner?: string };
  party?: { name: string; shortName: string; colour: string };
  politician?: { name: string; slug: string };
  date?: string;
  dateLabel?: string;
  tags?: string[];
  demo: boolean;
  /** Lower-cased searchable text. */
  text: string;
}

export interface SearchIndex {
  version: 1;
  generatedAt: string;
  docs: SearchIndexDoc[];
}

const lower = (parts: (string | undefined)[]) => parts.filter(Boolean).join(" ").toLowerCase();

export async function buildSearchIndex(repo: PublicRecordRepository): Promise<SearchIndex> {
  const [parties, politicians, claims, integrity, conduct, issues] = await Promise.all([
    repo.listParties(),
    repo.listPoliticians({ includeDemonstration: true }),
    repo.listClaims(),
    repo.listIntegrityMatters(),
    repo.listConductMatters(),
    repo.listIssues(),
  ]);
  const partyById = new Map(parties.map((p) => [p.id, p]));
  const docs: SearchIndexDoc[] = [];

  for (const p of politicians) {
    const party = partyById.get(p.partyId)!;
    const seat = p.chamber === "house" ? `Member for ${p.electorate}, ${p.state}` : `Senator for ${p.state}`;
    docs.push({
      type: "politician",
      id: p.id,
      href: `/politicians/${p.slug}`,
      title: p.fullName,
      subtitle: p.positionSummary,
      excerpt: seat,
      party: { name: party.name, shortName: party.shortName, colour: party.accentColour },
      demo: p.isDemonstration,
      text: lower([p.fullName, party.name, party.shortName, party.abbreviation, p.electorate, p.state, p.positionSummary, ...p.positions.map((x) => x.title)]),
    });
  }

  for (const c of claims) {
    const meta = EVIDENCE_STATUS[c.assessment.status];
    docs.push({
      type: "claim",
      id: c.claim.id,
      href: `/claims/${c.claim.id}`,
      title: c.claim.quote,
      subtitle: c.claim.context,
      excerpt: truncate(c.assessment.findings, 280),
      status: { label: meta.label, tone: meta.tone },
      party: { name: c.party.name, shortName: c.party.shortName, colour: c.party.accentColour },
      politician: { name: c.politician.fullName, slug: c.politician.slug },
      date: c.claim.date,
      dateLabel: formatDate(c.claim.date),
      tags: c.issues.map((i) => i.name),
      demo: c.claim.isDemonstration,
      text: lower([c.claim.quote, c.claim.summary, c.claim.context, c.claim.date, formatDate(c.claim.date), c.assessment.findings, c.assessment.context, c.politician.fullName, c.party.name, c.party.shortName, ...c.issues.map((i) => `${i.name} ${i.keywords.join(" ")}`)]),
    });
  }

  for (const m of integrity) {
    const meta = INTEGRITY_STATUS[m.matter.status];
    docs.push({
      type: "integrity",
      id: m.matter.id,
      href: `/integrity/${m.matter.id}`,
      title: m.matter.title,
      subtitle: m.matter.organisation,
      excerpt: truncate(m.matter.description, 260),
      status: { label: meta.label, tone: meta.tone },
      party: { name: m.party.name, shortName: m.party.shortName, colour: m.party.accentColour },
      politician: { name: m.politician.fullName, slug: m.politician.slug },
      date: m.matter.date,
      dateLabel: formatDate(m.matter.date),
      demo: m.matter.isDemonstration,
      text: lower([m.matter.title, m.matter.description, m.matter.organisation, m.matter.outcome, m.matter.date, formatDate(m.matter.date), m.politician.fullName, m.party.name, meta.label]),
    });
  }

  for (const m of conduct) {
    const meta = CONDUCT_STATUS[m.matter.status];
    docs.push({
      type: "conduct",
      id: m.matter.id,
      href: `/conduct/${m.matter.id}`,
      title: m.matter.title,
      excerpt: truncate(m.matter.allegationSummary, 240),
      status: { label: meta.label, tone: meta.tone, banner: meta.banner },
      party: { name: m.party.name, shortName: m.party.shortName, colour: m.party.accentColour },
      politician: { name: m.politician.fullName, slug: m.politician.slug },
      date: m.matter.date,
      dateLabel: formatDate(m.matter.date),
      demo: m.matter.isDemonstration,
      text: lower([m.matter.title, m.matter.allegationSummary, m.matter.outcome, m.matter.date, formatDate(m.matter.date), m.politician.fullName, m.party.name]),
    });
  }

  for (const i of issues) {
    docs.push({ type: "issue", id: i.id, href: `/issues/${i.slug}`, title: i.name, excerpt: i.description, demo: false, text: lower([i.name, i.description, ...i.keywords]) });
  }

  return { version: 1, generatedAt: new Date().toISOString(), docs };
}
