"use client";

import Link from "next/link";
import { useActionState } from "react";
import { submitCorrection, type SubmitState } from "@/app/submit/actions";

const initial: SubmitState = { ok: false };

export function SubmitCorrectionForm({ recordType, recordId, politicianId }: { recordType?: string; recordId?: string; politicianId?: string }) {
  const [state, action, pending] = useActionState(submitCorrection, initial);
  const field = "mt-1 w-full rounded border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none";
  const err = (k: string) => state.errors?.[k] && <p className="mt-1 text-xs text-status-red">{state.errors[k]}</p>;

  if (state.ok) {
    return (
      <div className="rounded-lg border border-status-green/40 bg-status-green-bg p-5 text-sm">
        <p className="font-semibold text-status-green">Submission received</p>
        <p className="mt-2 text-ink">{state.message}</p>
        <p className="mt-2 text-xs text-ink-muted">
          Reference: <span className="font-mono">{state.queueId}</span>. Reviewers can see it in the{" "}
          <Link href="/admin" className="underline underline-offset-4">
            review queue
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <fieldset>
        <legend className="text-sm font-semibold">Who is submitting?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {["politician or staff member", "journalist", "researcher", "member of the public"].map((r) => (
            <label key={r} className="flex items-center gap-2 rounded border border-line bg-surface px-3 py-2 text-sm">
              <input type="radio" name="role" value={r} defaultChecked={r === "member of the public"} /> {r[0].toUpperCase() + r.slice(1)}
            </label>
          ))}
        </div>
        {err("role")}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold">Record type</span>
          <select name="recordType" defaultValue={recordType ?? "claim"} className={field}>
            <option value="claim">Claim</option>
            <option value="integrity">Integrity matter</option>
            <option value="conduct">Serious conduct matter</option>
            <option value="politician">Politician profile</option>
          </select>
          {err("recordType")}
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Record ID</span> <span className="text-ink-faint">(optional)</span>
          <input name="recordId" defaultValue={recordId ?? ""} placeholder="e.g. clm_demo-0001" className={`${field} font-mono`} />
        </label>
      </div>
      <input type="hidden" name="politicianId" value={politicianId ?? ""} />

      <label className="block text-sm">
        <span className="font-semibold">What should change, and why?</span>
        <textarea name="summary" rows={5} className={field} placeholder="Describe the correction, clarification, response or additional evidence. Be specific about dates, figures and definitions." />
        {err("summary")}
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="font-semibold">Link to the original document</span>
          <input name="evidenceUrl" type="url" placeholder="https://" className={`${field} font-mono`} />
          {err("evidenceUrl")}
          <span className="mt-1 block text-xs text-ink-faint">Official datasets, reports, Hansard, court documents, media releases or established news reporting. Social-media posts and anonymous sources are not accepted as evidence.</span>
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Document title</span>
          <input name="evidenceTitle" className={field} />
          {err("evidenceTitle")}
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Publisher</span> <span className="text-ink-faint">(optional)</span>
          <input name="publisher" className={field} />
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-semibold">Contact email</span> <span className="text-ink-faint">(optional, for follow-up questions only)</span>
        <input name="contact" type="email" className={field} />
        {err("contact")}
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="rounded bg-ink px-4 py-2 text-sm font-semibold tracking-wide text-paper hover:bg-ink/90 disabled:opacity-50">
          {pending ? "Submitting…" : "Submit to the review queue"}
        </button>
        <p className="text-xs text-ink-faint">Submissions do not change a record automatically. Every submission is reviewed by a person.</p>
      </div>
    </form>
  );
}
