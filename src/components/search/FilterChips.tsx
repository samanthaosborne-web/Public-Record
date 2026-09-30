import Link from "next/link";

export interface ChipOption {
  label: string;
  href: string;
  active: boolean;
  count?: number;
  accent?: string;
}

/** Server-rendered filter chips: each option is a link, so filters are shareable URLs. */
export function FilterChips({ options, label }: { options: ChipOption[]; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={label}>
      <span className="label-caps mr-1 text-ink-faint">{label}</span>
      {options.map((o) => (
        <Link
          key={o.href}
          href={o.href}
          aria-current={o.active ? "true" : undefined}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide transition-colors ${
            o.active ? "border-ink bg-ink text-paper" : "border-line-strong bg-surface text-ink-muted hover:border-ink hover:text-ink"
          }`}
        >
          {o.accent && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: o.accent }} aria-hidden="true" />}
          {o.label}
          {o.count !== undefined && <span className={`font-mono text-[0.625rem] ${o.active ? "text-paper/70" : "text-ink-faint"}`}>{o.count}</span>}
        </Link>
      ))}
    </div>
  );
}
