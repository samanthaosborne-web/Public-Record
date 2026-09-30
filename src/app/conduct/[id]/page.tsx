import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PartyTag } from "@/components/ui/PartyTag";
import { DemoBadge, DemoNotice } from "@/components/ui/DemoBadge";
import { ConductRecordDetail } from "@/components/conduct/ConductRecord";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const repo = await getRepository();
  const d = await repo.getConductMatter(id);
  return { title: d ? `${d.matter.title} — ${d.politician.fullName}` : "Serious conduct matter" };
}

export default async function ConductMatterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepository();
  const detail = await repo.getConductMatter(id);
  if (!detail) notFound();
  const { matter, politician, party, changeLog } = detail;
  return (
    <Container className="py-8" narrow>
      <Breadcrumbs items={[{ label: "Serious conduct matters", href: "/conduct" }, { label: politician.fullName, href: `/politicians/${politician.slug}?tab=conduct` }, { label: "Matter" }]} />
      {matter.isDemonstration && (
        <div className="mb-4">
          <DemoNotice />
        </div>
      )}
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-caps text-ink-faint">Serious conduct matter</span>
          {matter.isDemonstration && <DemoBadge />}
        </div>
        <h1 className="mt-2 font-serif text-2xl leading-snug sm:text-3xl">{matter.title}</h1>
        <p className="mt-2 text-sm text-ink-muted">
          <Link href={`/politicians/${politician.slug}`} className="font-medium text-ink hover:underline">
            {politician.fullName}
          </Link>{" "}
          · <PartyTag party={party} /> · first reported {formatDate(matter.date)}
        </p>
      </header>
      <div className="mt-6">
        <ConductRecordDetail detail={detail} />
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
