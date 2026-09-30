# PUBLIC RECORD — data model

Tables (JSON files in the prototype, PostgreSQL tables in production; see `supabase/schema.sql`):

| Table | Prefix | Purpose |
| --- | --- | --- |
| `parties` | — | Real parties plus clearly fictional demonstration parties |
| `politicians` | `pol_` | Verified profile: name, party, chamber, seat, positions, APH profile, website, verification sources |
| `sources` | `src_` | Evidence register: title, publisher, URL, tier (1–3), kind, published/accessed dates |
| `issues` | `iss_` | Topic pages (economy, immigration, housing, health, climate, energy, defence, tax, crime, education, infrastructure) |
| `claims` | `clm_` | One record per factual statement; `checkable`; `currentAssessmentId`; optional `repeatsClaimId` |
| `claim_assessments` | `asm_` | Versioned assessments; `supersedesAssessmentId` keeps history |
| `claim_sources` | `cs_` | Sources attached to a claim with a role: original, primary, independent, contradictory, supporting, response |
| `claim_repetitions` | `rep_` | Each later occasion the same claim was made (date, context, source, reworded, evidenceChanged) |
| `corrections` | `cor_` | Politician correction behaviour: corrected, clarified, retracted, updated, repeated_unchanged, no_correction_located |
| `integrity_matters` | `int_` | Integrity lifecycle: allegation → referral → preliminary_assessment → formal_investigation → official_finding / referred_for_prosecution → charged → convicted; or cleared / no_finding / dismissed / overturned_appealed |
| `conduct_matters` | `cnd_` | Serious conduct: allegation, police_report, police_investigation, civil_proceeding, criminal_charge, trial, conviction, acquittal, matter_withdrawn, no_charges_laid, investigation_closed, finding_overturned |
| `responses` | `rsp_` | Politician responses/denials attached to claims, integrity or conduct matters |
| `daily_updates` | `upd_` | Feed cards: new_claim, claim_updated, correction, investigation_opened/closed, new_official_finding, court_update, repeated_claim, conduct_update, profile_verified |
| `review_queue` | `rev_` | AI discoveries, public submissions, politician responses, evidence updates; statuses pending/approved/edited/rejected/needs_evidence/duplicate; risk flags |
| `change_log` | `chg_` | PUBLIC RECORD's own corrections (append-only) |

Every record carries `createdAt` and `updatedAt`. Nothing is deleted; superseded records are linked,
not removed.

## Evidence statuses

`supported`, `mostly_supported`, `mixed` (context required), `contradicted`, `insufficient`,
`unverifiable`, `not_checkable` (opinion / prediction). Definitions live in `src/lib/labels.ts` and are
rendered on the methodology page.

## Statistics

* Politician: claims checked (excludes `not_checkable`), supported (supported + mostly supported),
  mixed, contradicted, insufficient/unverifiable, opinion logged, corrections (corrected + clarified +
  retracted + updated), integrity matters, conduct matters.
* Site: claims checked, supported, requiring context, contradicted, corrections recorded, active
  integrity matters (allegation through charged), completed integrity matters, politicians profiled.
  Demonstration records are excluded from homepage figures by default.

No ranking statistics exist and none should be added.

## Validation

`npm run data:validate` checks referential integrity across all tables, timestamps, that serious
review items require human review, and that banned labels do not appear in record text.
