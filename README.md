# PUBLIC RECORD

**What they said. What the evidence shows.**

A politically neutral, searchable, sourced public record of factual claims made by Australian federal
politicians, whether the evidence supports or contradicts them, the corrections they make, and
integrity and conduct matters — with the primary evidence behind every entry.

PUBLIC RECORD evaluates evidence relating to individual claims. It does not determine a person's
honesty, motivation or character.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

Other scripts:

```bash
npm run typecheck              # tsc --noEmit
npm run lint                   # eslint
npm run data:validate          # referential-integrity and terminology checks on src/data/*.json
npm run data:build-politicians # rebuild politicians.json from scripts/research/<date>/*.json
npm run pipeline:dry-run       # run the daily-update pipeline offline (mock stages, nothing published)
```

## What is in the prototype

* **Home** — search, party filters (ALL / LABOR / LIBERAL / NATIONALS / GREENS / ONE NATION),
  politician cards, neutral site statistics, Today's Record.
* **23 verified politician profiles** (name, party, seat, current office, APH profile, official
  website), each verified on 30 September 2026 against Parliament of Australia records and recent
  reporting, with the verification sources shown on the profile. The verification data lives in
  `scripts/research/2026-09-30/` and is merged by `scripts/build-politicians.cjs`.
* **Demonstration records** for six *fictional* politicians in *fictional* parties: 19 claims across
  all seven evidence statuses (including a repeated claim, a reclassified claim and opinion/prediction
  statements), 4 integrity matters (formal investigation, cleared, official finding, dismissed),
  2 serious conduct matters (police investigation; no charges laid), responses, corrections, a
  daily feed, a review queue and a change log. Every demonstration record is labelled and every
  demonstration source opens a placeholder page inside the site. No real person is depicted, and
  no allegation about any real politician has been invented.
* **Records for the real politicians, drafted from published sources.** Each profile now carries the
  politician's parliamentary career from the Parliament of Australia record; claim records built from
  fact-checks published by AAP FactCheck and RMIT ABC Fact Check (the verbatim statement, its original
  source, the fact-checker's verdict, the official sources the fact-check relied on, the politician's
  response and any correction); and integrity matters drawn from court judgments, Auditor-General
  reports, police statements, electoral and parliamentary records, each with its status history and
  the politician's response. Every one of these records is labelled **AI draft · pending editorial
  review** until a human reviewer signs it off. The curated inputs live in
  `scripts/research/2026-10-01/` and are loaded by `node scripts/ingest-research.cjs <dir>`, which is
  idempotent. Politicians for whom no qualifying fact-check or official record was located show
  "No verified records added yet" in that section.
* **Claims**, **Issues**, **Integrity**, **Serious conduct**, **Today's Record**, **Methodology**,
  **Corrections log**, **Search**, **Submit a correction**, **Review queue (admin)**, **Source register**.

## Editorial review

AI-drafted records are published with the label **AI draft · pending editorial review** until a
person approves them. The review happens in `review/REVIEW.md`, which lists every pending record
with a link to its page on the live site. Change a record's **Decision** cell to `approve`,
`approve as <status>`, `reject` or `hold`, add a note if you like, and commit; the Pages workflow
runs `node scripts/apply-review.cjs`, which applies the decisions to `src/data`, logs them in
`review/decisions-log.json` and the site's corrections log, commits the result back to the branch
and republishes the site. `npm run review:apply` does the same locally.

## Hosted copy

A static, read-only copy of the site is published to the `gh-pages` branch by
`scripts/build-static-snapshot.mjs` (manually or by the GitHub Actions workflow in
`.github/workflows/pages.yml`). With GitHub Pages set to serve that branch, it is available at
https://samanthaosborne-web.github.io/Public-Record/ . The static copy runs live search in the
browser from a bundled index, but right-of-reply submissions and reviewer decisions need the
running app or a server deployment (for example Vercel, which builds this repository with no extra
configuration).

## Architecture

See `docs/ARCHITECTURE.md` (data layer, pipeline, scheduling, safety rules) and `docs/DATA_MODEL.md`.
The PostgreSQL/Supabase schema is in `supabase/schema.sql`. Switch the data source with:

```
PUBLIC_RECORD_DATA_SOURCE=supabase SUPABASE_URL=... SUPABASE_ANON_KEY=...
```

## Editorial rules baked into the code

* Claims are classified as supported, mostly supported, mixed / context required, contradicted by
  evidence, insufficient evidence, unverifiable, or opinion / prediction — never true/false, never
  "lies".
* Politicians are never labelled liar, corrupt, criminal, sexual offender or dishonest unless an
  applicable court or official body has made that finding (the data validator rejects such labels).
* Integrity and conduct matters carry exact lifecycle statuses; an allegation is never a finding, and
  outcomes that clear a person are displayed with equal prominence.
* Serious matters are never auto-published: the schema, the review action and the pipeline gate all
  require human review.
* Every material change PUBLIC RECORD makes stays visible in the corrections log.
