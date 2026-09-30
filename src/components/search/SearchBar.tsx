export function SearchBar({ defaultValue = "", size = "lg", autoFocus = false }: { defaultValue?: string; size?: "md" | "lg"; autoFocus?: boolean }) {
  const big = size === "lg";
  return (
    <form action="/search" method="get" role="search" className="w-full">
      <label htmlFor="site-search" className="sr-only">
        Search
      </label>
      <div className={`flex items-center rounded-lg border border-line-strong bg-surface shadow-card focus-within:border-ink ${big ? "px-4 py-2.5 sm:px-5 sm:py-3" : "px-3 py-1.5"}`}>
        <svg viewBox="0 0 20 20" className={`${big ? "h-5 w-5" : "h-4 w-4"} shrink-0 text-ink-faint`} fill="none" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          id="site-search"
          name="q"
          type="search"
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          placeholder="Search a politician, claim, issue or keyword…"
          className={`ml-3 w-full bg-transparent text-ink placeholder:text-ink-faint focus:outline-none ${big ? "text-base sm:text-lg" : "text-sm"}`}
        />
        <button type="submit" className={`ml-2 shrink-0 rounded bg-ink font-semibold tracking-wide text-paper hover:bg-ink/90 ${big ? "px-4 py-2 text-sm" : "px-3 py-1 text-xs"}`}>
          Search
        </button>
      </div>
    </form>
  );
}
