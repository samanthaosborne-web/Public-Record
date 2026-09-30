const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-09-30" -> "30 September 2026". Accepts full ISO timestamps too. */
export function formatDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${Number(d)} ${MONTHS[Number(mo) - 1]} ${y}`;
}

/** "2026-09-30" -> "30 Sep 2026". */
export function formatDateShort(iso: string | undefined | null): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${Number(d)} ${MONTHS[Number(mo) - 1].slice(0, 3)} ${y}`;
}

/** "2026-09-30T08:15:00+10:00" -> "30 September 2026, 08:15". */
export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d, h, mi] = m;
  const date = `${Number(d)} ${MONTHS[Number(mo) - 1]} ${y}`;
  return h ? `${date}, ${h}:${mi}` : date;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-AU").format(n);
}

export function pluralise(n: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(n)} ${n === 1 ? singular : plural}`;
}

/** Today's date in ISO form (Australia/Sydney) — used for "as of" labels. */
export function todayISO(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts; // en-CA gives YYYY-MM-DD
}

export function truncate(text: string, max = 160): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 40 ? cut.lastIndexOf(" ") : max)}…`;
}

export function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
