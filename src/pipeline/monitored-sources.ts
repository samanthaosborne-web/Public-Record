import type { MonitoredSource } from "./types";

/**
 * Publishers the daily update watches. URLs are the public landing pages
 * or feeds; real fetchers will replace them with API endpoints where they
 * exist (e.g. ParlInfo, ABS Data API, AEC results feeds).
 */
export const MONITORED_SOURCES: MonitoredSource[] = [
  { id: "hansard", name: "Hansard (ParlInfo)", tier: 1, kind: "hansard", url: "https://parlinfo.aph.gov.au/", pollIntervalHours: 24 },
  { id: "aph", name: "Parliament of Australia", tier: 1, kind: "parliament", url: "https://www.aph.gov.au/", pollIntervalHours: 24 },
  { id: "pm", name: "Prime Minister's media releases and transcripts", tier: 1, kind: "ministerial", url: "https://www.pm.gov.au/media", pollIntervalHours: 6 },
  { id: "ministers", name: "Ministerial websites (ministers.*.gov.au)", tier: 1, kind: "ministerial", url: "https://www.directory.gov.au/", pollIntervalHours: 6 },
  { id: "parties", name: "Party websites (media releases)", tier: 1, kind: "party", url: "https://www.liberal.org.au/, https://www.alp.org.au/, https://www.nationals.org.au/, https://greens.org.au/, https://www.onenation.org.au/", pollIntervalHours: 6 },
  { id: "transcripts", name: "Press conference and interview transcripts", tier: 1, kind: "transcript", url: "(politician office transcript pages)", pollIntervalHours: 6 },
  { id: "nacc", name: "National Anti-Corruption Commission", tier: 1, kind: "integrity_body", url: "https://www.nacc.gov.au/news-and-media", pollIntervalHours: 24 },
  { id: "courts", name: "Court publications (Federal Court, High Court, state courts)", tier: 1, kind: "court", url: "https://www.fedcourt.gov.au/, https://www.hcourt.gov.au/", pollIntervalHours: 24 },
  { id: "afp", name: "Australian Federal Police", tier: 1, kind: "police", url: "https://www.afp.gov.au/news-centre", pollIntervalHours: 24 },
  { id: "aec", name: "Australian Electoral Commission", tier: 1, kind: "electoral", url: "https://www.aec.gov.au/media/", pollIntervalHours: 24 },
  { id: "abs", name: "Australian Bureau of Statistics", tier: 1, kind: "statistics", url: "https://www.abs.gov.au/release-calendar", pollIntervalHours: 24 },
  { id: "rba", name: "Reserve Bank of Australia", tier: 1, kind: "central_bank", url: "https://www.rba.gov.au/media-releases/", pollIntervalHours: 24 },
  { id: "treasury", name: "The Treasury", tier: 1, kind: "treasury", url: "https://treasury.gov.au/publication", pollIntervalHours: 24 },
  { id: "anao", name: "Australian National Audit Office", tier: 1, kind: "auditor", url: "https://www.anao.gov.au/work/performance-audit", pollIntervalHours: 24 },
  { id: "abc", name: "ABC News", tier: 2, kind: "news", url: "https://www.abc.net.au/news/politics", pollIntervalHours: 6 },
  { id: "aap", name: "Australian Associated Press / AAP FactCheck", tier: 2, kind: "fact_check", url: "https://www.aap.com.au/factcheck/", pollIntervalHours: 24 },
  { id: "sbs", name: "SBS News", tier: 2, kind: "news", url: "https://www.sbs.com.au/news/topic/politics", pollIntervalHours: 6 },
  { id: "reuters", name: "Reuters", tier: 2, kind: "news", url: "https://www.reuters.com/world/asia-pacific/", pollIntervalHours: 6 },
  { id: "rmit", name: "RMIT fact-checking", tier: 2, kind: "fact_check", url: "https://www.rmit.edu.au/", pollIntervalHours: 24 },
];
