import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { EVIDENCE_STATUS } from "@/lib/labels";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EvidenceBadge } from "@/components/ui/StatusBadge";
import { PartyTag } from "@/components/ui/PartyTag";
import { DemoBadge, DemoNotice } from "@/components/ui/DemoBadge";
import { EvidencePanel } from "@/components/claims/EvidencePanel";
import { RepetitionTimeline } from "@/components/claims/RepetitionTimeline";
import { CorrectionBehaviour } from "@/components/claims/CorrectionBehaviour";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const repo = await getRepository();
  const detail = await repo.getClaim(id);
  return { title: detail ? `Claim: “${detail.claim.summary}” — ${detail.politician.fullName}` : "Claim" };
}

export default async function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepository();
  const detail = await repo.getClaim(id);
  if (!detail) notFound();
  const sources = await repo.listSources();
  const sourcesById = new Map(sources.map((s) => [s.id, s]));
  const { claim, assessment, politician, party, issues, changeLog } = detail;

  return (
    <Container className="py-8" narrow>
      <Breadcrumbs items={[{ label: "Claims", href: "/claims" }, { label: politician.fullName, href: `/politicians/${politician.slug}` }, { label: "Claim" }]} />

      {claim.isDemonstration && (
        <div className="mb-4">
          <DemoNotice />
        </div>
      )}

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-caps text-ink-faint">Claim</span>
          {claim.isDemonstration && <DemoBadge />}
          {!claim.checkable && <span className="text-xs text-ink-faint">Logged as opinion or prediction</span>}
        </div>
        <h1 className="mt-2 font-serif text-2xl leading-snug sm:text-3xl">“{claim.quote}”</h1>
        <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="label-caps text-ink-faint">Speaker</dt>
            <dd className="mt-0.5">
              <Link href={`/politicians/${politician.slug}`} className="font-medium hover:underline">
                {politician.fullName}
              </Link>
              <br />
              <PartyTag party={party} />
            </dd>
          </div>
          <div>
            <dt className="label-caps text-ink-faint">Date</dt>
            <dd className="mt-0.5">{formatDate(claim.date)}</dd>
          </div>
          <div>
            <dt className="label-caps text-ink-faint">Location / context</dt>
            <dd className="mt-0.5">{claim.context}</dd>
          </div>
        </dl>
      </header>

      <section className="mt-6 rounded-lg border border-line bg-surface p-5">
        <p className="label-caps text-ink-faint">Evidence status</p>
        <div className="mt-2">
          <EvidenceBadge status={assessment.status} size="lg" />
        </div>
        <p className="mt-1 text-xs text-ink-muted">{EVIDENCE_STATUS[assessment.status].description}</p>
        <h2 className="label-caps mt-5 text-ink-faint">What the evidence shows</h2>
        <p className="mt-2 text-base leading-relaxed">{assessment.findings}</p>
        {issues.length > 0 && (
          <p className="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
            Issues:
            {issues.map((i) => (
              <Link key={i.id} href={`/issues/${i.slug}`} className="rounded bg-paper-deep px-1.5 py-0.5 hover:bg-line">
                {i.name}
              </Link>
            ))}
          </p>
        )}
      </section>

      <div className="mt-6 space-y-6">
        <EvidencePanel detail={detail} defaultOpen id="evidence" />
        <RepetitionTimeline detail={detail} sourcesById={sourcesById} />
        {claim.checkable && <CorrectionBehaviour corrections={detail.corrections} sourcesById={sourcesById} />}

        {changeLog.length > 0 && (
          <section className="rounded-lg border border-line bg-surface p-4 sm:p-5">
            <h3 className="label-caps text-ink-faint">Changes to this record</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {changeLog.map((c) => (
                <li key={c.id}>
                  <span className="text-xs text-ink-muted">{formatDate(c.date)}</span> · {c.summary}
                  {c.reason && <span className="block text-xs text-ink-faint">{c.reason}</span>}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs">
              <Link href="/corrections" className="text-accent underline underline-offset-4">
                Full corrections log
              </Link>
            </p>
          </section>
        )}

        <p className="text-sm text-ink-muted">
          Last reviewed {formatDate(assessment.reviewedAt)}.{" "}
          <Link href={`/submit?type=claim&id=${claim.id}`} className="text-accent underline underline-offset-4">
            Submit correction or additional evidence
          </Link>
        </p>
      </div>
    </Container>
  );
}
