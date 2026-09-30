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
* Real politicians currently show **"No verified records added yet."** Candidate records enter the
  review queue and are published only after human review.
* **Claims**, **Issues**, **Integrity**, **Serious conduct**, **Today's Record**, **Methodology**,
  **Corrections log**, **Search**, **Submit a correction**, **Review queue (admin)**, **Source register**.

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
