"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepository } from "@/lib/data";
import type { ReviewStatus } from "@/lib/types";

const DECISIONS: Record<string, ReviewStatus> = {
  approve: "approved",
  edit: "edited",
  reject: "rejected",
  request_evidence: "needs_evidence",
  duplicate: "duplicate",
};

/**
 * Records a reviewer decision. In the prototype this updates the in-memory
 * review queue; with Supabase it writes to review_queue and, on approval,
 * the publish step creates the target record and a change-log entry.
 */
export async function reviewDecision(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const status = DECISIONS[decision];
  if (!id || !status) return;

  const repo = await getRepository();
  const item = await repo.getReviewItem(id);
  if (!item) return;

  // Guard: serious matters can never be approved without a qualifying source and a human note.
  const serious = item.targetType === "integrity" || item.targetType === "conduct";
  if (serious && (status === "approved" || status === "edited")) {
    const hasQualifyingSource = item.sources.some((s) => s.tier <= 2);
    if (!hasQualifyingSource || notes.length < 10) {
      redirect(`/admin/review/${id}?error=serious`);
    }
  }

  await repo.updateReviewItem(id, { status, reviewerNotes: notes || undefined });
  revalidatePath("/admin");
  revalidatePath(`/admin/review/${id}`);
  redirect(`/admin?decided=${id}`);
}
