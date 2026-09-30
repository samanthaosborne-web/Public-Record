import { createJsonRepository } from "./json-adapter";
import { createSupabaseRepository } from "./supabase-adapter";
import type { PublicRecordRepository } from "./repository";

export type { PublicRecordRepository } from "./repository";
export type * from "./repository";

let cached: Promise<PublicRecordRepository> | null = null;

/**
 * Returns the configured repository.
 *
 *   PUBLIC_RECORD_DATA_SOURCE=json      (default) bundled JSON database
 *   PUBLIC_RECORD_DATA_SOURCE=supabase  requires SUPABASE_URL and SUPABASE_ANON_KEY
 */
export function getRepository(): Promise<PublicRecordRepository> {
  if (!cached) {
    const source = process.env.PUBLIC_RECORD_DATA_SOURCE ?? "json";
    if (source === "supabase") {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_ANON_KEY;
      if (!url || !key) throw new Error("PUBLIC_RECORD_DATA_SOURCE=supabase requires SUPABASE_URL and SUPABASE_ANON_KEY");
      cached = createSupabaseRepository(url, key);
    } else {
      cached = Promise.resolve(createJsonRepository());
    }
  }
  return cached;
}
