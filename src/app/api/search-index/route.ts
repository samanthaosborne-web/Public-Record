import { getRepository } from "@/lib/data";
import { buildSearchIndex } from "@/lib/search-index";

/** JSON search index consumed by the static copy of the site and by client-side search. */
export async function GET() {
  const repo = await getRepository();
  const index = await buildSearchIndex(repo);
  return Response.json(index, { headers: { "Cache-Control": "public, max-age=300" } });
}
