import Link from "next/link";
import { isExternalUrl, hostnameOf } from "@/lib/format";

export function ExternalIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={className} fill="none" aria-hidden="true">
      <path d="M4 2H2.5A.5.5 0 0 0 2 2.5v7a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M7 2h3v3M10 2 5.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Link to an original document. External links open in a new tab and show their host. */
export function SourceLink({ href, children, showHost = true, className = "" }: { href: string; children: React.ReactNode; showHost?: boolean; className?: string }) {
  if (isExternalUrl(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent ${className}`}
      >
        <span>{children}</span>
        <ExternalIcon />
        {showHost && <span className="text-xs text-ink-faint">{hostnameOf(href)}</span>}
      </a>
    );
  }
  return (
    <Link href={href} className={`inline-flex items-center gap-1 text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent ${className}`}>
      <span>{children}</span>
      {showHost && <span className="text-xs text-ink-faint">demonstration document</span>}
    </Link>
  );
}
