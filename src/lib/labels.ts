import type {
  ConductStatus,
  CorrectionStatus,
  DailyUpdateType,
  EvidenceStatus,
  IntegrityStatus,
  PositionType,
  ReviewItemKind,
  ReviewStatus,
  RiskFlag,
  SourceKind,
  SourceTier,
} from "./types";

/** Visual tone for status badges. Red is reserved for "contradicted" and adverse findings. */
export type Tone = "green" | "green-soft" | "amber" | "red" | "grey" | "slate" | "blue";

export interface StatusMeta {
  label: string;
  short: string;
  tone: Tone;
  description: string;
}

export const EVIDENCE_STATUS: Record<EvidenceStatus, StatusMeta> = {
  supported: {
    label: "Supported",
    short: "Supported",
    tone: "green",
    description: "The best available evidence is consistent with the claim as stated.",
  },
  mostly_supported: {
    label: "Mostly supported",
    short: "Mostly supported",
    tone: "green-soft",
    description: "The evidence supports the substance of the claim with minor inaccuracies or omissions.",
  },
  mixed: {
    label: "Mixed / context required",
    short: "Mixed",
    tone: "amber",
    description:
      "The claim is accurate under some definitions, periods or measures but not others. The context matters.",
  },
  contradicted: {
    label: "Contradicted by evidence",
    short: "Contradicted",
    tone: "red",
    description: "The best available evidence is inconsistent with the claim as stated.",
  },
  insufficient: {
    label: "Insufficient evidence",
    short: "Insufficient evidence",
    tone: "grey",
    description: "Not enough reliable evidence exists to support or contradict the claim.",
  },
  unverifiable: {
    label: "Unverifiable",
    short: "Unverifiable",
    tone: "grey",
    description: "The claim cannot be tested against any available record (for example private conversations).",
  },
  not_checkable: {
    label: "Opinion / prediction — not fact-checkable",
    short: "Not fact-checkable",
    tone: "slate",
    description:
      "A statement of opinion, value or prediction. PUBLIC RECORD logs it for context but does not assess it.",
  },
};

export const EVIDENCE_STATUS_ORDER: EvidenceStatus[] = [
  "supported",
  "mostly_supported",
  "mixed",
  "contradicted",
  "insufficient",
  "unverifiable",
  "not_checkable",
];

export const CORRECTION_STATUS: Record<CorrectionStatus, StatusMeta> = {
  corrected: {
    label: "Corrected",
    short: "Corrected",
    tone: "green",
    description: "The politician publicly corrected the figure or statement.",
  },
  clarified: {
    label: "Clarified",
    short: "Clarified",
    tone: "green-soft",
    description: "The politician added context or narrowed the statement without withdrawing it.",
  },
  retracted: {
    label: "Retracted",
    short: "Retracted",
    tone: "green",
    description: "The politician withdrew the statement.",
  },
  updated: {
    label: "Updated",
    short: "Updated",
    tone: "blue",
    description: "The politician restated the claim using newer figures.",
  },
  repeated_unchanged: {
    label: "Repeated unchanged",
    short: "Repeated unchanged",
    tone: "amber",
    description: "The same claim was made again after the original check, without change.",
  },
  no_correction_located: {
    label: "No correction located",
    short: "No correction located",
    tone: "grey",
    description: "PUBLIC RECORD has not located any correction, clarification or restatement.",
  },
};

export type IntegrityPhase = "allegation" | "process" | "adverse_finding" | "no_adverse_finding";

export const INTEGRITY_STATUS: Record<IntegrityStatus, StatusMeta & { phase: IntegrityPhase; active: boolean }> = {
  allegation: {
    label: "Allegation",
    short: "Allegation",
    tone: "grey",
    phase: "allegation",
    active: true,
    description: "An allegation has been made publicly. No body has assessed it.",
  },
  referral: {
    label: "Referral",
    short: "Referral",
    tone: "grey",
    phase: "process",
    active: true,
    description: "The matter has been referred to an integrity, police or parliamentary body.",
  },
  preliminary_assessment: {
    label: "Preliminary assessment",
    short: "Preliminary assessment",
    tone: "blue",
    phase: "process",
    active: true,
    description: "A body is assessing whether to investigate. This is not a finding.",
  },
  formal_investigation: {
    label: "Formal investigation",
    short: "Formal investigation",
    tone: "blue",
    phase: "process",
    active: true,
    description: "A formal investigation is under way. This is not a finding.",
  },
  official_finding: {
    label: "Official finding",
    short: "Official finding",
    tone: "amber",
    phase: "adverse_finding",
    active: false,
    description: "An official body has published a finding. See the outcome for its exact terms.",
  },
  referred_for_prosecution: {
    label: "Referred for prosecution",
    short: "Referred for prosecution",
    tone: "amber",
    phase: "process",
    active: true,
    description: "The matter has been referred to prosecutors. No charge has been laid.",
  },
  charged: {
    label: "Charged",
    short: "Charged",
    tone: "amber",
    phase: "process",
    active: true,
    description: "A charge has been laid. The person is presumed innocent until a court decides otherwise.",
  },
  convicted: {
    label: "Convicted",
    short: "Convicted",
    tone: "red",
    phase: "adverse_finding",
    active: false,
    description: "A court has recorded a conviction.",
  },
  cleared: {
    label: "Cleared",
    short: "Cleared",
    tone: "green",
    phase: "no_adverse_finding",
    active: false,
    description: "The responsible body found no wrongdoing.",
  },
  no_finding: {
    label: "No finding",
    short: "No finding",
    tone: "green-soft",
    phase: "no_adverse_finding",
    active: false,
    description: "The matter concluded without any finding against the person.",
  },
  dismissed: {
    label: "Dismissed",
    short: "Dismissed",
    tone: "green",
    phase: "no_adverse_finding",
    active: false,
    description: "The matter was dismissed by the responsible body or court.",
  },
  overturned_appealed: {
    label: "Overturned / appealed",
    short: "Overturned / appealed",
    tone: "green-soft",
    phase: "no_adverse_finding",
    active: false,
    description: "An earlier finding was overturned on appeal, or is under appeal (see outcome).",
  },
};

export const INTEGRITY_STATUS_ORDER: IntegrityStatus[] = [
  "allegation",
  "referral",
  "preliminary_assessment",
  "formal_investigation",
  "official_finding",
  "referred_for_prosecution",
  "charged",
  "convicted",
  "cleared",
  "no_finding",
  "dismissed",
  "overturned_appealed",
];

/**
 * Conduct statuses. `banner` is the prominent line displayed at least as
 * prominently as the allegation itself.
 */
export const CONDUCT_STATUS: Record<ConductStatus, StatusMeta & { banner: string; findingOfGuilt: boolean }> = {
  allegation: {
    label: "Allegation",
    short: "Allegation",
    tone: "grey",
    banner: "ALLEGATION — NO FINDING OF GUILT",
    findingOfGuilt: false,
    description: "An allegation has been made publicly. No police, court or parliamentary finding exists.",
  },
  police_report: {
    label: "Police report",
    short: "Police report",
    tone: "grey",
    banner: "POLICE REPORT MADE — NO CHARGES LAID — NO FINDING OF GUILT",
    findingOfGuilt: false,
    description: "A report has been made to police. No charge has been laid.",
  },
  police_investigation: {
    label: "Police investigation",
    short: "Police investigation",
    tone: "blue",
    banner: "POLICE INVESTIGATION — NO CHARGES LAID — NO FINDING OF GUILT",
    findingOfGuilt: false,
    description: "Police have confirmed an investigation. No charge has been laid.",
  },
  civil_proceeding: {
    label: "Civil proceeding",
    short: "Civil proceeding",
    tone: "blue",
    banner: "CIVIL PROCEEDING — NO CRIMINAL FINDING",
    findingOfGuilt: false,
    description: "A civil claim is before a court. Civil cases decide liability, not criminal guilt.",
  },
  criminal_charge: {
    label: "Criminal charge",
    short: "Charged",
    tone: "amber",
    banner: "CHARGED — NOT CONVICTED — PRESUMED INNOCENT",
    findingOfGuilt: false,
    description: "A charge has been laid. The person is presumed innocent unless a court finds otherwise.",
  },
  trial: {
    label: "Trial",
    short: "On trial",
    tone: "amber",
    banner: "ON TRIAL — NO VERDICT — PRESUMED INNOCENT",
    findingOfGuilt: false,
    description: "The matter is before a court. No verdict has been delivered.",
  },
  conviction: {
    label: "Conviction",
    short: "Convicted",
    tone: "red",
    banner: "CONVICTED BY A COURT",
    findingOfGuilt: true,
    description: "A court has found the person guilty. The wording reflects the court's finding.",
  },
  acquittal: {
    label: "Acquittal",
    short: "Acquitted",
    tone: "green",
    banner: "ACQUITTED — FOUND NOT GUILTY",
    findingOfGuilt: false,
    description: "A court found the person not guilty.",
  },
  matter_withdrawn: {
    label: "Matter withdrawn",
    short: "Withdrawn",
    tone: "green",
    banner: "MATTER WITHDRAWN — NO FINDING OF GUILT",
    findingOfGuilt: false,
    description: "The complaint, charge or claim was withdrawn.",
  },
  no_charges_laid: {
    label: "No charges laid",
    short: "No charges laid",
    tone: "green",
    banner: "NO CHARGES LAID — NO FINDING OF GUILT",
    findingOfGuilt: false,
    description: "Police or prosecutors decided not to lay charges.",
  },
  investigation_closed: {
    label: "Investigation closed",
    short: "Investigation closed",
    tone: "green",
    banner: "INVESTIGATION CLOSED — NO CHARGES LAID — NO FINDING OF GUILT",
    findingOfGuilt: false,
    description: "The investigation concluded without charges.",
  },
  finding_overturned: {
    label: "Finding overturned",
    short: "Finding overturned",
    tone: "green",
    banner: "FINDING OVERTURNED ON APPEAL",
    findingOfGuilt: false,
    description: "An earlier finding was overturned by a higher court or body.",
  },
};

export const UPDATE_TYPE: Record<DailyUpdateType, { label: string; tone: Tone }> = {
  new_claim: { label: "New claim", tone: "blue" },
  claim_updated: { label: "Claim updated", tone: "blue" },
  correction: { label: "Correction", tone: "green" },
  investigation_opened: { label: "Investigation opened", tone: "amber" },
  investigation_closed: { label: "Investigation closed", tone: "green" },
  new_official_finding: { label: "New official finding", tone: "amber" },
  court_update: { label: "Court update", tone: "slate" },
  repeated_claim: { label: "Repeated claim", tone: "amber" },
  conduct_update: { label: "Conduct matter update", tone: "slate" },
  profile_verified: { label: "Profile verified", tone: "grey" },
};

export const REVIEW_STATUS: Record<ReviewStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pending review", tone: "amber" },
  approved: { label: "Approved", tone: "green" },
  edited: { label: "Edited and approved", tone: "green-soft" },
  rejected: { label: "Rejected", tone: "grey" },
  needs_evidence: { label: "More evidence requested", tone: "blue" },
  duplicate: { label: "Marked duplicate", tone: "grey" },
};

export const REVIEW_KIND: Record<ReviewItemKind, string> = {
  ai_discovery: "AI-discovered",
  public_submission: "Public submission",
  politician_response: "Politician response",
  evidence_update: "Evidence update",
};

export const RISK_FLAG: Record<RiskFlag, { label: string; tone: Tone; description: string }> = {
  serious_allegation: {
    label: "Serious allegation",
    tone: "red",
    description: "Sexual misconduct, criminal or corruption allegation. Never auto-published; legal review required.",
  },
  integrity_matter: {
    label: "Integrity matter",
    tone: "amber",
    description: "Creates or changes an integrity record. Human approval required.",
  },
  single_source: {
    label: "Single source",
    tone: "amber",
    description: "Only one source located. Contested claims need more than one source.",
  },
  partisan_source_only: {
    label: "Partisan source only",
    tone: "amber",
    description: "The only sources located are partisan. Do not rely on them alone.",
  },
  possible_duplicate: {
    label: "Possible duplicate",
    tone: "grey",
    description: "A similar claim already exists. Consider recording as a repetition instead.",
  },
  low_source_quality: {
    label: "Low source quality",
    tone: "amber",
    description: "Sources are Tier 3 or below the site's evidence standard.",
  },
  defamation_review: {
    label: "Defamation review",
    tone: "red",
    description: "Wording must be checked against the legal status of the matter before publication.",
  },
  stale_evidence: {
    label: "Stale evidence",
    tone: "grey",
    description: "The evidence may have been superseded by a newer release.",
  },
  opinion_not_fact: {
    label: "Opinion, not fact",
    tone: "slate",
    description: "The statement looks like opinion or prediction and may not be checkable.",
  },
};

export const SOURCE_TIER: Record<SourceTier, { label: string; short: string; description: string }> = {
  1: {
    label: "Tier 1 — Primary",
    short: "Primary",
    description: "Official data and documentation: Parliament, Hansard, legislation, ABS, AEC, ATO, Treasury, RBA, departments, courts, police, NACC, Auditor-General, Royal Commissions, official inquiries.",
  },
  2: {
    label: "Tier 2 — High-quality independent",
    short: "Independent",
    description: "Established newsrooms and fact-checkers such as the ABC, Reuters, AAP, SBS and major Australian mastheads.",
  },
  3: {
    label: "Tier 3 — Supporting",
    short: "Supporting",
    description: "Other credible sources. Never relied on alone for a contested claim.",
  },
};

export const SOURCE_KIND: Record<SourceKind, string> = {
  hansard: "Hansard",
  parliamentary_document: "Parliamentary document",
  legislation: "Legislation",
  dataset: "Dataset",
  official_report: "Official report",
  official_statement: "Official statement",
  court_document: "Court document",
  police_statement: "Police statement",
  integrity_body: "Integrity body",
  media_release: "Media release",
  transcript: "Transcript",
  news_report: "News report",
  fact_check: "Fact check",
  official_profile: "Official profile",
  other: "Other",
};

export const POSITION_TYPE: Record<PositionType, string> = {
  executive: "Executive",
  opposition: "Opposition",
  party: "Party role",
  parliamentary: "Parliamentary role",
  backbench: "Backbench",
};
