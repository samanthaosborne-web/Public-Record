import type { Metadata } from "next";
import { getRepository } from "@/lib/data";
import type { PartyId } from "@/lib/types";
import { one, type SearchParams } from "@/lib/params";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PoliticianDirectory } from "@/components/politicians/PoliticianDirectory";
import { DemoNotice } from "@/components/ui/DemoBadge";

export const metadata: Metadata = { title: "Politicians" };

export default async function PoliticiansPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const repo = await getRepository();
  const [parties, politicians, demo] = await Promise.all([repo.listParties(), repo.listPoliticians(), repo.listPoliticians({ demonstrationOnly: true })]);
  const partyById = new Map(parties.map((p) => [p.id, p]));
  const enrich = (list: typeof politicians) =>
    Promise.all(list.map(async (politician) => ({ politician, party: partyById.get(politician.partyId)!, stats: await repo.getPoliticianStats(politician.id) })));
  const [items, demoItems] = await Promise.all([enrich(politicians), enrich(demo)]);
  const partyParam = one(params.party);
  const initialParty = partyParam && partyById.has(partyParam as PartyId) ? (partyParam as PartyId) : "all";
  const sort = one(params.sort) === "position" ? "position" : "alphabetical";

  return (
    <Container className="py-10">
      <SectionHeading
        as="h1"
        title="Politicians"
        description="Federal parliamentarians profiled so far. Name, party, seat and current office are verified against Parliament of Australia records and recent reporting. The list is designed to expand."
      />
      <PoliticianDirectory items={items} parties={parties} initialParty={initialParty} initialSort={sort} />

      <div className="mt-14">
        <SectionHeading title="Demonstration profiles" description="Fictional politicians used to show the full record format. No real person is depicted." />
        <div className="mb-5">
          <DemoNotice />
        </div>
        <PoliticianDirectory items={demoItems} parties={parties} showFilters={false} showSort={false} />
      </div>
    </Container>
  );
}
