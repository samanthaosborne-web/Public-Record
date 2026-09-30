"use client";

import { useEffect, useRef, useState } from "react";

const SIZES = { sm: "h-10 w-10 text-sm", md: "h-14 w-14 text-base", lg: "h-24 w-24 text-2xl sm:h-28 sm:w-28" } as const;

/**
 * Portrait with a guaranteed fallback.
 *
 * Initials render first (server and client). The official portrait is only
 * shown once the browser confirms it loaded. Load/error events that fire
 * before React hydrates are picked up from the element's own state in an
 * effect, so a blocked or missing image never leaves a broken icon behind.
 */
export function PoliticianAvatar({
  name,
  photoUrl,
  size = "md",
  className = "",
}: {
  name: string;
  photoUrl?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth > 0) setLoaded(true);
  }, [photoUrl]);

  return (
    <div
      role="img"
      aria-label={name}
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-paper-deep font-serif text-ink-muted ring-1 ring-line ${SIZES[size]} ${className}`}
    >
      {!loaded && <span aria-hidden="true">{initials}</span>}
      {photoUrl && (
        // Official portraits come from the Parliament of Australia image API. A plain <img> with a
        // load-confirmed swap is used deliberately so a remote outage can neither break builds nor
        // leave a broken image; the optimiser is bypassed for the same reason.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={ref}
          src={photoUrl}
          alt=""
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={`absolute inset-0 h-full w-full object-cover ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}
