import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { IntegrityBadge } from "@/components/ui/StatusBadge";
import { PartyTag } from "@/components/ui/PartyTag";
import { DemoBadge, DemoNotice } from "@/components/ui/DemoBadge";
import { IntegrityRecordDetail } from "@/components/integrity/IntegrityRecord";
import { formatDate } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const repo = await getRepository();
  const d = await repo.getIntegrityMatter(id);
  return { title: d ? `${d.matter.title} — ${d.politician.fullName}` : "Integrity matter" };
}

export default async function IntegrityMatterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepository();
  const detail = await repo.getIntegrityMatter(id);
  if (!detail) notFound();
  const { matter, politician, party, changeLog } = detail;
  return (
    <Container className="py-8" narrow>
      <Breadcrumbs items={[{ label: "Integrity matters", href: "/integrity" }, { label: politician.fullName, href: `/politicians/${politician.slug}?tab=integrity` }, { label: "Matter" }]} />
      {matter.isDemonstration && (
        <div className="mb-4">
          <DemoNotice />
        </div>
      )}
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-caps text-ink-faint">Integrity matter</span>
          {matter.isDemonstration && <DemoBadge />}
        </div>
        <h1 className="mt-2 font-serif text-2xl leading-snug sm:text-3xl">{matter.title}</h1>
        <p className="mt-2 text-sm text-ink-muted">
          <Link href={`/politicians/${politician.slug}`} className="font-medium text-ink hover:underline">
            {politician.fullName}
          </Link>{" "}
          · <PartyTag party={party} /> · {formatDate(matter.date)}
        </p>
        <div className="mt-3">
          <IntegrityBadge status={matter.status} size="lg" prominent />
        </div>
      </header>
      <div className="mt-6">
        <IntegrityRecordDetail detail={detail} />
      </div>
      {changeLog.length > 0 && (
        <section className="mt-6 rounded-lg border border-line bg-surface p-4">
          <h2 className="label-caps text-ink-faint">Changes to this record</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {changeLog.map((c) => (
              <li key={c.id}>
                <span className="text-xs text-ink-muted">{formatDate(c.date)}</span> · {c.summary}
              </li>
            ))}
          </ul>
        </section>
      )}
    </Container>
  );
}
