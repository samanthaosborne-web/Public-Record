import type { Metadata } from "next";
import Link from "next/link";
import { getRepository } from "@/lib/data";
import { one, type SearchParams } from "@/lib/params";
import { Container } from "@/components/ui/Container";
import { SubmitCorrectionForm } from "@/components/submit/SubmitCorrectionForm";

export const metadata: Metadata = { title: "Submit a correction or additional evidence" };

export default async function SubmitPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const type = one(sp.type);
  const id = one(sp.id);
  const repo = await getRepository();
  let context: { label: string; href: string; politicianId?: string } | null = null;
  if (type === "claim" && id) {
    const c = await repo.getClaim(id);
    if (c) context = { label: `Claim by ${c.politician.fullName}: “${c.claim.summary}”`, href: `/claims/${id}`, politicianId: c.politician.id };
  } else if (type === "integrity" && id) {
    const m = await repo.getIntegrityMatter(id);
    if (m) context = { label: `Integrity matter: ${m.matter.title}`, href: `/integrity/${id}`, politicianId: m.politician.id };
  } else if (type === "conduct" && id) {
    const m = await repo.getConductMatter(id);
    if (m) context = { label: `Serious conduct matter: ${m.matter.title}`, href: `/conduct/${id}`, politicianId: m.politician.id };
  } else if (type === "politician" && id) {
    const p = await repo.getPoliticianById(id);
    if (p) context = { label: `Profile: ${p.fullName}`, href: `/politicians/${p.slug}`, politicianId: p.id };
  }

  return (
    <Container className="py-10" narrow>
      <h1 className="font-serif text-3xl">Submit a correction or additional evidence</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        Politicians, their staff, journalists, researchers and members of the public can submit corrections, responses, clarifications or new evidence for any record. A submission does not change the record: it enters the review queue, where a person assesses the evidence against the same standards used for every other entry. Material changes are logged in the{" "}
        <Link href="/corrections" className="underline underline-offset-4">
          corrections log
        </Link>
        .
      </p>
      {context && (
        <p className="mt-4 rounded border border-line bg-surface px-4 py-3 text-sm">
          <span className="label-caps text-ink-faint">About</span>
          <br />
          <Link href={context.href} className="underline underline-offset-4">
            {context.label}
          </Link>
        </p>
      )}
      <div className="mt-6 rounded-lg border border-line bg-surface p-5">
        <SubmitCorrectionForm recordType={type} recordId={context ? id : undefined} politicianId={context?.politicianId} />
      </div>
    </Container>
  );
}
