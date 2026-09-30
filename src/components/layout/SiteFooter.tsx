import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-paper-deep/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-semibold tracking-[0.14em]">PUBLIC RECORD</p>
          <p className="mt-2 max-w-md text-sm text-ink-muted">
            What they said. What the evidence shows. PUBLIC RECORD evaluates evidence relating to individual claims. It does
            not determine a person’s honesty, motivation or character.
          </p>
          <p className="mt-3 text-xs text-ink-faint">
            Not affiliated with any party, campaign or government body. Every entry links to its primary evidence.
          </p>
        </div>
        <div>
          <p className="label-caps text-ink-faint">Explore</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li><Link className="hover:underline" href="/politicians">Politicians</Link></li>
            <li><Link className="hover:underline" href="/claims">Claims</Link></li>
            <li><Link className="hover:underline" href="/issues">Issues</Link></li>
            <li><Link className="hover:underline" href="/integrity">Integrity matters</Link></li>
            <li><Link className="hover:underline" href="/conduct">Serious conduct matters</Link></li>
            <li><Link className="hover:underline" href="/today">Today’s Record</Link></li>
          </ul>
        </div>
        <div>
          <p className="label-caps text-ink-faint">About</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li><Link className="hover:underline" href="/methodology">How PUBLIC RECORD works</Link></li>
            <li><Link className="hover:underline" href="/corrections">Corrections log</Link></li>
            <li><Link className="hover:underline" href="/sources">Source register</Link></li>
            <li><Link className="hover:underline" href="/submit">Submit a correction or evidence</Link></li>
            <li><Link className="hover:underline" href="/admin">Review queue (admin)</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
