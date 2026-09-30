import type { Metadata } from "next";
import Link from "next/link";
import { getRepository } from "@/lib/data";
import { formatDate } from "@/lib/format";
import type { ChangeKind, ChangeLogEntry } from "@/lib/types";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Tone } from "@/lib/labels";

export const metadata: Metadata = { title: "Corrections log" };

const KIND: Record<ChangeKind, { label: string; tone: Tone }> = {
  classification_changed: { label: "Classification changed", tone: "amber" },
  evidence_added: { label: "Evidence added", tone: "blue" },
  record_created: { label: "Record created", tone: "grey" },
  record_amended: { label: "Record amended", tone: "blue" },
  status_changed: { label: "Status changed", tone: "slate" },
  response_added: { label: "Response added", tone: "green" },
  profile_updated: { label: "Profile updated", tone: "grey" },
};

function hrefFor(entry: ChangeLogEntry, slugById: Map<string, string>) {
  switch (entry.recordType) {
    case "claim":
      return `/claims/${entry.recordId}`;
    case "integrity":
      return `/integrity/${entry.recordId}`;
    case "conduct":
      return `/conduct/${entry.recordId}`;
    case "politician":
      return `/politicians/${slugById.get(entry.recordId) ?? ""}`;
  }
}

export default async function CorrectionsPage() {
  const repo = await getRepository();
  const [entries, politicians] = await Promise.all([repo.listChangeLog(), repo.listPoliticians({ includeDemonstration: true })]);
  const slugById = new Map(politicians.map((p) => [p.id, p.slug]));
  const nameById = new Map(politicians.map((p) => [p.id, p.fullName]));
  const dates = [...new Set(entries.map((e) => e.date))];

  return (
    <Container className="py-10" narrow>
      <SectionHeading
        as="h1"
        title="Corrections"
        description="Every material change PUBLIC RECORD makes to its own records stays visible here. Historical records are never silently rewritten: a superseded assessment remains on the record, linked from the one that replaced it."
      />
      <p className="mb-6 text-sm text-ink-muted">
        Looking for corrections made by politicians to their own statements? Those are recorded on each claim under “Correction behaviour” and on each profile’s Corrections tab.
      </p>
      {dates.map((date) => (
        <section key={date} className="mb-8">
          <h2 className="mb-2 font-serif text-xl">{formatDate(date)}</h2>
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {entries
              .filter((e) => e.date === date)
              .map((e) => (
                <li key={e.id} className="p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label={KIND[e.kind].label} tone={KIND[e.kind].tone} size="sm" />
                    <span className="text-xs text-ink-muted">{e.recordType}</span>
                    {e.politicianId && <span className="text-xs text-ink-muted">· {nameById.get(e.politicianId)}</span>}
                    <span className="ml-auto font-mono text-[0.625rem] text-ink-faint">{e.recordId}</span>
                  </div>
                  <p className="mt-2">
                    <Link href={hrefFor(e, slugById)} className="hover:underline">
                      {e.summary}
                    </Link>
                  </p>
                  {(e.previousValue || e.newValue) && (
                    <p className="mt-1 text-xs text-ink-muted">
                      {e.previousValue ? <>From “{e.previousValue}” </> : null}
                      {e.newValue ? <>to “{e.newValue}”</> : null}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-ink-faint">Reason: {e.reason}</p>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </Container>
  );
}
