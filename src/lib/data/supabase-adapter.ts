import type { Dataset } from "@/lib/types";
import { InMemoryRepository } from "./engine";
import type { PublicRecordRepository } from "./repository";

/**
 * Supabase / PostgreSQL adapter.
 *
 * Stage 1 (this file): load every table through Supabase's PostgREST endpoint
 * into the same `Dataset` shape the JSON adapter uses, then reuse the
 * in-memory engine. This keeps the UI unchanged while the database comes
 * online. Stage 2: push hot queries (search, per-politician lists) down to
 * SQL views one method at a time.
 *
 * Column names in supabase/schema.sql are snake_case; the mapper below
 * converts them to the camelCase used by the TypeScript types.
 */

const TABLES: Record<keyof Dataset, string> = {
  parties: "parties",
  politicians: "politicians",
  sources: "sources",
  claims: "claims",
  claimAssessments: "claim_assessments",
  claimSources: "claim_sources",
  claimRepetitions: "claim_repetitions",
  corrections: "corrections",
  integrityMatters: "integrity_matters",
  conductMatters: "conduct_matters",
  responses: "responses",
  issues: "issues",
  dailyUpdates: "daily_updates",
  reviewQueue: "review_queue",
  changeLog: "change_log",
};

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function camelKeys<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[snakeToCamel(k)] = v;
  return out as T;
}

async function fetchTable<T>(baseUrl: string, apiKey: string, table: string): Promise<T[]> {
  const res = await fetch(`${baseUrl}/rest/v1/${table}?select=*`, {
    headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}` },
    // Pages revalidate on their own schedule; the daily pipeline calls revalidatePath after publishing.
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Supabase: failed to load ${table} (${res.status})`);
  const rows = (await res.json()) as Record<string, unknown>[];
  return rows.map((r) => camelKeys<T>(r));
}

export async function createSupabaseRepository(baseUrl: string, apiKey: string): Promise<PublicRecordRepository> {
  const entries = await Promise.all(
    (Object.keys(TABLES) as (keyof Dataset)[]).map(async (key) => [key, await fetchTable(baseUrl, apiKey, TABLES[key])] as const),
  );
  const dataset = Object.fromEntries(entries) as unknown as Dataset;
  return new InMemoryRepository(dataset);
}
