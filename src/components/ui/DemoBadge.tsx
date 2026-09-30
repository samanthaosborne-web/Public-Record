export function DemoBadge({ className = "", long = false }: { className?: string; long?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border border-dashed border-line-strong bg-paper px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-muted ${className}`}
      title="Fictional demonstration record. No real person is depicted."
    >
      Demonstration data{long ? " — fictional politician" : ""}
    </span>
  );
}

export function DemoNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div className="rounded border border-dashed border-line-strong bg-paper-deep/60 px-4 py-3 text-sm text-ink-muted">
      <span className="font-semibold text-ink">Demonstration data.</span>{" "}
      {children ?? "This record involves a fictional politician and fictional sources. It exists only to show how PUBLIC RECORD presents evidence. No real person is depicted."}
    </div>
  );
}
