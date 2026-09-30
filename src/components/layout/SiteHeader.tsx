"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/politicians", label: "Politicians" },
  { href: "/claims", label: "Claims" },
  { href: "/issues", label: "Issues" },
  { href: "/today", label: "Today’s Record" },
  { href: "/methodology", label: "Methodology" },
  { href: "/corrections", label: "Corrections" },
] as const;

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2" onClick={() => setOpen(false)}>
          <span className="font-semibold tracking-[0.14em] text-ink">PUBLIC RECORD</span>
          <span className="hidden text-xs text-ink-faint md:inline">Australia</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded px-3 py-1.5 text-sm transition-colors ${
                  active ? "bg-paper-deep text-ink" : "text-ink-muted hover:bg-paper-deep hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <Link
            href="/search"
            aria-label="Search"
            className="rounded p-2 text-ink-muted hover:bg-paper-deep hover:text-ink"
          >
            <SearchIcon className="h-5 w-5" />
          </Link>
          <button
            type="button"
            className="rounded p-2 text-ink-muted hover:bg-paper-deep hover:text-ink lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
              {open ? (
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              ) : (
                <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Primary mobile" className="border-t border-line bg-paper lg:hidden">
          <ul className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded px-2 py-2.5 text-sm text-ink hover:bg-paper-deep"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/admin" onClick={() => setOpen(false)} className="block rounded px-2 py-2.5 text-sm text-ink-muted hover:bg-paper-deep">
                Review queue (admin)
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
