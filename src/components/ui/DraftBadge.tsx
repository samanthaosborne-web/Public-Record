/** Shown on any record drafted by AI from cited sources that a person has not yet signed off. */
export function DraftBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded bg-status-slate-bg px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-status-slate ${className}`}
      title="Drafted by AI from the published sources cited on the record. Awaiting editorial sign-off; every link goes to the original document."
    >
      AI draft · pending editorial review
    </span>
  );
}
