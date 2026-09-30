/**
 * Daily update orchestrator.
 *
 *   npm run pipeline:dry-run        # runs every stage offline, prints drafts
 *   npm run pipeline                # enqueues drafts in the review queue
 *
 * Scheduling: run this from any cron-style scheduler (GitHub Actions,
 * Supabase cron, a Vercel cron route, systemd timer). See docs/ARCHITECTURE.md.
 * The orchestrator never publishes records: it produces review-queue items.
 */
import { MONITORED_SOURCES } from "./monitored-sources";
import { mockStages } from "./stages/mock-stages";
import type { PipelineContext, PipelineStages } from "./types";

export async function runDailyUpdate(stages: PipelineStages = mockStages, options: { dryRun?: boolean; runDate?: string } = {}) {
  const runDate = options.runDate ?? new Date().toISOString().slice(0, 10);
  const ctx: PipelineContext = {
    runId: `run_${runDate}_${Math.random().toString(36).slice(2, 8)}`,
    runDate,
    dryRun: options.dryRun ?? true,
    log: (m) => console.log(`[${runDate}] ${m}`),
  };
  ctx.log(`starting ${ctx.runId} (${ctx.dryRun ? "dry run" : "live"})`);

  const docs = await stages.ingest(MONITORED_SOURCES, ctx);
  const texts = await stages.extractText(docs, ctx);
  const candidates = await stages.extractClaims(texts, ctx);
  const matches = await stages.matchClaims(candidates, ctx);
  const bundles = await stages.retrieveEvidence(matches, ctx);
  const quality = await stages.checkSourceQuality(bundles, ctx);
  const duplicates = await stages.detectDuplicates(matches, ctx);
  const drafts = await stages.draft({ matches, bundles, quality, duplicates }, ctx);
  const decisions = await stages.gate(drafts, ctx);
  const queued = await stages.publish(decisions, ctx);

  return { ctx, docs, candidates, matches, drafts, decisions, queued };
}

const invokedDirectly = typeof process !== "undefined" && process.argv[1] && /run-daily-update\.(ts|js|mjs)$/.test(process.argv[1]);
if (invokedDirectly) {
  const dryRun = !process.argv.includes("--live");
  runDailyUpdate(mockStages, { dryRun })
    .then((result) => {
      console.log("\nDrafts for human review:");
      for (const d of result.decisions) {
        console.log(`- [${d.draft.targetType}] "${d.draft.claimText}"`);
        console.log(`    suggested: ${d.draft.suggestedStatus ?? "—"} | flags: ${d.draft.riskFlags.join(", ") || "none"} | sources: ${d.draft.sources.length}`);
        console.log(`    ${d.draft.aiExplanation}`);
        for (const b of d.blockers) console.log(`    BLOCKER: ${b}`);
      }
      console.log(`\n${result.decisions.length} item(s) require human review. Nothing was published.`);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
