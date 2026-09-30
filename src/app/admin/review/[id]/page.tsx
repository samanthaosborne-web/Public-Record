import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getRepository } from "@/lib/data";
import type { ClaimListItem } from "@/lib/data/repository";
import { one, type SearchParams } from "@/lib/params";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ReviewItemScreen } from "@/components/admin/ReviewItemScreen";

export const metadata: Metadata = { title: "Review item" };

export default async function ReviewItemPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  await connection();
  const { id } = await params;
  const sp = await searchParams;
  const repo = await getRepository();
  const item = await repo.getReviewItem(id);
  if (!item) notFound();
  const politician = item.politicianId ? await repo.getPoliticianById(item.politicianId) : null;
  const similarIds = new Set(item.similarClaims.map((s) => s.claimId));
  if (item.targetId && item.targetType === "claim") similarIds.add(item.targetId);
  const similar = (await Promise.all([...similarIds].map((cid) => repo.getClaim(cid)))).filter((c): c is NonNullable<typeof c> => c !== null) as ClaimListItem[];

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: "Review queue", href: "/admin" }, { label: item.id }]} />
      <h1 className="mb-4 font-serif text-2xl">Review item</h1>
      <ReviewItemScreen item={item} politician={politician} similar={similar} error={one(sp.error)} />
    </Container>
  );
}
