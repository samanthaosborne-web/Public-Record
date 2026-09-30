# PUBLIC RECORD — architecture

> What they said. What the evidence shows.

PUBLIC RECORD is a Next.js 16 (App Router, TypeScript, Tailwind CSS 4) application with a strictly
separated data layer, a structured local JSON database for the prototype, a PostgreSQL/Supabase
schema for production, and a staged daily-update pipeline that ends in a human review queue.

## 1. Runtime layout

```
src/
  app/                    Routes (server components by default)
    page.tsx              Home: search, party filters, politician cards, stats, Today's Record
    politicians/          Directory and profiles (tabs: overview, claims, corrections, integrity, conduct, sources)
    claims/               Claim list + individual claim record with SHOW THE EVIDENCE
    integrity/  conduct/  Separate record types with lifecycle statuses
    issues/               Topic pages showing claims across parties
    today/                Daily update feed (by date)
    methodology/          How PUBLIC RECORD works
    corrections/          PUBLIC RECORD's own change log
    search/               Grouped search results
    submit/               Right-of-reply / correction form (server action -> review queue)
    admin/                Review queue and review screen (server actions)
    demo/sources/[id]     Placeholder pages for fictional demonstration sources
  components/             Reusable UI (PoliticianCard, PoliticianProfile parts, ClaimCard, EvidencePanel,
                          StatusBadge, IntegrityRecord, ConductRecord, SourceList, DailyUpdateFeed,
                          ReviewQueue, Search, Filters, CorrectionsLog pieces)
  lib/
    types.ts              Domain model (mirrors supabase/schema.sql)
    labels.ts             Every status label, description and tone in one place
    data/repository.ts    PublicRecordRepository contract used by all pages
    data/engine.ts        In-memory query engine (stats, search, read models)
    data/json-adapter.ts  Prototype adapter: bundled JSON
    data/supabase-adapter.ts  Production adapter: PostgREST -> same engine
  data/*.json             Structured local database (one file per table)
  pipeline/               Daily update pipeline: stage contracts, mock stages, orchestrator
supabase/schema.sql       PostgreSQL schema with constraints, triggers and RLS
scripts/                  Data build/validation scripts and the research files used to verify profiles
```

## 2. Data layer abstraction

Every page calls `getRepository()` and only ever uses the `PublicRecordRepository` interface
(`src/lib/data/repository.ts`). Two adapters exist:

| Adapter | Selected by | Storage | Status |
| --- | --- | --- | --- |
| JSON | default | `src/data/*.json` bundled at build time | complete |
| Supabase | `PUBLIC_RECORD_DATA_SOURCE=supabase` + `SUPABASE_URL` + `SUPABASE_ANON_KEY` | PostgreSQL via PostgREST | stage 1 (loads tables into the shared engine) |

Both adapters produce a `Dataset` and hand it to `InMemoryRepository` (`engine.ts`), which derives all
read models: enriched claims, profiles, stats, search, feed items. This means the frontend never
changes when the database arrives. Stage 2 of the Supabase adapter pushes hot queries (search,
per-politician lists) down to SQL views one method at a time.

Review-queue writes (`submitReviewItem`, `updateReviewItem`) are held in memory for the life of the
server process in the JSON adapter; with Supabase they become inserts/updates on `review_queue`.

## 3. Record principles enforced in code

* **Permanent IDs.** `pol_`, `clm_`, `asm_`, `cs_`, `rep_`, `cor_`, `int_`, `cnd_`, `rsp_`, `src_`,
  `iss_`, `upd_`, `rev_`, `chg_` prefixes; every record has `createdAt` and `updatedAt`.
* **History is never overwritten.** A claim points at `currentAssessmentId`; older assessments stay in
  `claim_assessments` linked via `supersedesAssessmentId`. Material changes append to `change_log`,
  which is append-only in SQL (trigger) and surfaced at `/corrections`.
* **Terminology.** `scripts/validate-data.cjs` fails the data build if banned labels (liar, corrupt
  politician, criminal politician, sex offender, dishonest as a label) appear in any record text.
  Status vocabularies live in `src/lib/labels.ts`; there is no "lies" field anywhere.
* **Allegation is not a finding.** Integrity and conduct matters carry an exact lifecycle status and
  a status history; conduct statuses render a banner ("ALLEGATION — NO FINDING OF GUILT") that is at
  least as prominent as the allegation text. Cleared/dismissed/no-charges outcomes are rendered in
  the same green treatment as any positive outcome.
* **Human review.** `integrity_matters` and `conduct_matters` have `human_reviewed_at`; the review
  queue has a CHECK constraint that serious targets always `requires_human_review`; the admin action
  refuses to approve a serious item without a Tier 1/2 source and a reviewer note; the pipeline's
  gate stage adds hard blockers for serious drafts.
* **Demonstration data is labelled.** Every demonstration record has `isDemonstration: true`,
  fictional politicians belong to fictional parties, and demo sources point at `/demo/sources/<id>`
  placeholder pages so no fictional evidence is ever attributed to a real publisher or person.

## 4. Daily update pipeline

```
SOURCE INGESTION -> TRANSCRIPTION / TEXT EXTRACTION -> CLAIM EXTRACTION -> CLAIM MATCHING
-> EVIDENCE RETRIEVAL -> SOURCE QUALITY CHECKING -> DUPLICATE DETECTION -> AI DRAFT
-> HUMAN REVIEW (gate) -> PUBLISH (to the review queue only)
```

* Contracts: `src/pipeline/types.ts` (`PipelineStages`, typed inputs/outputs per stage).
* Monitored publishers: `src/pipeline/monitored-sources.ts` (Hansard, APH, PM and ministerial sites,
  party sites, transcripts, NACC, courts, AFP, AEC, ABS, RBA, Treasury, ANAO, ABC, AAP FactCheck,
  SBS, Reuters, RMIT fact-checking).
* Mock stages: `src/pipeline/stages/mock-stages.ts` run offline against the JSON database so the
  full pipeline is exercisable today (`npm run pipeline:dry-run`). Each mock documents the real
  implementation it stands in for (fetchers, speech-to-text, LLM extraction, vector matching, data
  APIs, allow-listed source tiers).
* Orchestrator: `src/pipeline/run-daily-update.ts`. It never writes to claim/integrity/conduct
  tables. Its only output is review-queue items. Publication happens when a reviewer approves an item
  in `/admin`, at which point the publish step (to be wired to the database) creates the record, the
  `daily_updates` card and the `change_log` entry.

### Scheduling (not runnable in the prototype environment)

Any of the following can call the orchestrator once a day:

* **GitHub Actions**: a `schedule: cron: "0 19 * * *"` workflow (05:00 AEST) running
  `npm run pipeline` with `PUBLIC_RECORD_DATA_SOURCE=supabase` and a service-role key.
* **Supabase cron + Edge Function**: `pg_cron` invoking an Edge Function that runs the stages.
* **Vercel Cron**: a `app/api/cron/daily/route.ts` handler (protected by `CRON_SECRET`) that calls
  `runDailyUpdate({ dryRun: false })` and then `revalidatePath('/')`, `/today`, and affected records.

### Safety rules the pipeline must keep

1. Serious criminal, corruption or sexual-misconduct allegations are never auto-published. The gate
   adds `serious_allegation` + `defamation_review` flags and hard blockers.
2. A candidate whose only sources are anonymous social-media, forums, blogs or unsourced AI output
   is drafted with `low_source_quality` and cannot be approved as a conduct matter.
3. Repetitions are recorded on the original claim (`claim_repetitions`) rather than as new claims;
   the evidence is refreshed first if it changed.
4. AI explanations always cite the retrieved sources and never invent one.

## 5. Adding a real record (checklist for reviewers)

1. Verify the statement in a Tier 1 source (Hansard, transcript, media release) — record it as the
   `original` claim source.
2. Retrieve Tier 1 evidence; add Tier 2 fact-checks/reporting; never rely on one partisan source.
3. Classify with one of the seven evidence statuses; write neutral findings and context.
4. Record correction behaviour and the politician's response, or `no_response_located` with the
   date PUBLIC RECORD asked.
5. Approve in the review queue; the publish step writes `daily_updates` and `change_log`.

## 6. Expanding the politician list

Add a research file under `scripts/research/<date>/` in the same shape as the existing ones (verified
against APH), then run `npm run data:build-politicians`. The script merges profiles, verification
sources, "profile verified" feed items and change-log entries for offices that changed.
