import { dataset } from "@/data";
import { InMemoryRepository } from "./engine";
import type { PublicRecordRepository } from "./repository";

/**
 * JSON adapter: loads the structured local database bundled at build time.
 * Review-queue submissions made through the UI persist in memory for the
 * lifetime of the server process only (see docs/ARCHITECTURE.md).
 */
export function createJsonRepository(): PublicRecordRepository {
  return new InMemoryRepository(dataset);
}
