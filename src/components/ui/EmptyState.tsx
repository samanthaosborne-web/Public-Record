export function EmptyState({ title = "No verified records added yet.", children }: { title?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-surface/60 px-5 py-8 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{children}</div>}
    </div>
  );
}
