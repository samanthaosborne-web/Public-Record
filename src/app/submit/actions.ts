"use server";

import { getRepository } from "@/lib/data";
import type { RecordType } from "@/lib/types";

export interface SubmitState {
  ok: boolean;
  message?: string;
  queueId?: string;
  errors?: Record<string, string>;
}

const ROLES = ["politician or staff member", "journalist", "researcher", "member of the public"] as const;
const TYPES: RecordType[] = ["claim", "integrity", "conduct", "politician"];

/**
 * Right-of-reply / correction submissions. A submission never changes a
 * record directly: it enters the review queue as a public_submission item.
 */
export async function submitCorrection(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const role = String(formData.get("role") ?? "");
  const recordType = String(formData.get("recordType") ?? "");
  const recordId = String(formData.get("recordId") ?? "").trim();
  const politicianId = String(formData.get("politicianId") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const evidenceUrl = String(formData.get("evidenceUrl") ?? "").trim();
  const evidenceTitle = String(formData.get("evidenceTitle") ?? "").trim();
  const publisher = String(formData.get("publisher") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();

  const errors: Record<string, string> = {};
  if (!ROLES.includes(role as (typeof ROLES)[number])) errors.role = "Choose who you are submitting as.";
  if (!TYPES.includes(recordType as RecordType)) errors.recordType = "Choose the type of record.";
  if (summary.length < 30) errors.summary = "Explain the correction or evidence in at least 30 characters.";
  if (!/^https?:\/\//i.test(evidenceUrl) && !evidenceUrl.startsWith("/demo/sources/")) errors.evidenceUrl = "Provide a link to the original document (https://…).";
  if (evidenceTitle.length < 3) errors.evidenceTitle = "Give the document a title.";
  if (contact && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact)) errors.contact = "Enter a valid email address or leave it blank.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const repo = await getRepository();
  const item = await repo.submitReviewItem({
    kind: role === "politician or staff member" ? "politician_response" : "public_submission",
    targetType: recordType as RecordType,
    targetId: recordId || undefined,
    politicianId: politicianId || undefined,
    submittedBy: role,
    claimText: summary,
    aiExplanation: "Public submission awaiting review. No AI assessment has been run on this item yet.",
    sources: [{ url: evidenceUrl, title: evidenceTitle, publisher: publisher || "Not stated", tier: 3, qualityNote: "Tier to be assessed by a reviewer." }],
    riskFlags: [],
  });
  return { ok: true, queueId: item.id, message: "Thank you. Your submission has entered the review queue. It does not change the record until a reviewer has assessed the evidence." };
}
