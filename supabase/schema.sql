-- PUBLIC RECORD — PostgreSQL / Supabase schema
--
-- Mirrors src/lib/types.ts. Column names are snake_case; the Supabase adapter
-- (src/lib/data/supabase-adapter.ts) converts them to camelCase.
--
-- Principles encoded here:
--   * Records are never deleted: superseded assessments stay in claim_assessments
--     and are linked via supersedes_assessment_id; every material change is
--     written to change_log.
--   * Every table carries created_at and updated_at (maintained by trigger).
--   * IDs are stable, human-readable text keys (e.g. clm_0001) so links persist.
--   * Serious matters (integrity_matters, conduct_matters) require
--     human_reviewed_at before they can be published (CHECK constraint on the
--     published view is enforced in the publish step; see docs/ARCHITECTURE.md).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helper: keep updated_at current
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Parties and politicians
-- ---------------------------------------------------------------------------
create table parties (
  id               text primary key,                      -- 'alp', 'lib', ...
  name             text not null,
  short_name       text not null,
  abbreviation     text not null,
  accent_colour    text not null,
  filter_label     text,
  is_demonstration boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table politicians (
  id                text primary key,                     -- 'pol_albanese-anthony'
  slug              text not null unique,
  full_name         text not null,
  given_name        text not null,
  family_name       text not null,
  sort_name         text not null,
  party_id          text not null references parties(id),
  party_note        text,
  chamber           text not null check (chamber in ('house','senate')),
  electorate        text,
  state             text not null check (state in ('NSW','VIC','QLD','WA','SA','TAS','ACT','NT')),
  positions         jsonb not null default '[]'::jsonb,   -- [{title,type,since,sourceId}]
  position_summary  text not null,
  position_rank     integer not null default 50,
  aph_display_name  text,
  aph_id            text,
  aph_profile_url   text,
  official_website  text,
  photo_url         text,
  photo_credit      text,
  first_elected     integer,
  is_demonstration  boolean not null default false,
  verification      jsonb not null,                       -- {verifiedAt, sourceIds[], notes}
  last_record_update date not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (chamber <> 'house' or electorate is not null)
);
create index politicians_party_idx on politicians(party_id);

-- ---------------------------------------------------------------------------
-- Sources (the evidence register)
-- ---------------------------------------------------------------------------
create table sources (
  id               text primary key,                      -- 'src_...'
  title            text not null,
  publisher        text not null,
  url              text not null,
  tier             smallint not null check (tier in (1,2,3)),
  kind             text not null check (kind in ('hansard','parliamentary_document','legislation','dataset','official_report','official_statement','court_document','police_statement','integrity_body','media_release','transcript','news_report','fact_check','official_profile','other')),
  published_at     date,
  accessed_at      date not null,
  note             text,
  is_demonstration boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index sources_url_idx on sources(url);

-- ---------------------------------------------------------------------------
-- Issues / topics
-- ---------------------------------------------------------------------------
create table issues (
  id          text primary key,                           -- 'iss_housing'
  slug        text not null unique,
  name        text not null,
  description text not null,
  keywords    text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Claims
-- ---------------------------------------------------------------------------
create table claims (
  id                    text primary key,                 -- 'clm_0001'
  politician_id         text not null references politicians(id),
  quote                 text not null,
  summary               text not null,
  date                  date not null,
  context               text not null,
  issue_ids             text[] not null default '{}',     -- denormalised for the adapter; see claim_issues
  original_source_id    text not null references sources(id),
  checkable             boolean not null default true,
  current_assessment_id text,                             -- FK added after claim_assessments exists
  repeats_claim_id      text references claims(id),
  is_demonstration      boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index claims_politician_idx on claims(politician_id);
create index claims_date_idx on claims(date desc);

create table claim_issues (
  claim_id text not null references claims(id),
  issue_id text not null references issues(id),
  primary key (claim_id, issue_id)
);

create table claim_assessments (
  id                       text primary key,              -- 'asm_0001-v1'
  claim_id                 text not null references claims(id),
  version                  integer not null,
  status                   text not null check (status in ('supported','mostly_supported','mixed','contradicted','insufficient','unverifiable','not_checkable')),
  findings                 text not null,
  context                  text,
  reviewed_at              date not null,
  reviewed_by              text not null check (reviewed_by in ('human','ai_draft')),
  supersedes_assessment_id text references claim_assessments(id),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (claim_id, version)
);
alter table claims add constraint claims_current_assessment_fk foreign key (current_assessment_id) references claim_assessments(id);

create table claim_sources (
  id         text primary key,
  claim_id   text not null references claims(id),
  source_id  text not null references sources(id),
  role       text not null check (role in ('original','primary','independent','contradictory','supporting','response')),
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index claim_sources_claim_idx on claim_sources(claim_id);

create table claim_repetitions (
  id               text primary key,
  claim_id         text not null references claims(id),
  date             date not null,
  context          text not null,
  source_id        text references sources(id),
  reworded         boolean not null default false,
  evidence_changed boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index claim_repetitions_claim_idx on claim_repetitions(claim_id);

-- What the politician did after the check. Observable behaviour only; never motive.
create table corrections (
  id            text primary key,
  claim_id      text not null references claims(id),
  politician_id text not null references politicians(id),
  status        text not null check (status in ('corrected','clarified','retracted','updated','repeated_unchanged','no_correction_located')),
  date          date,
  description   text not null,
  source_id     text references sources(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Responses (right of reply) — attach to claims, integrity or conduct matters
-- ---------------------------------------------------------------------------
create table responses (
  id            text primary key,
  politician_id text not null references politicians(id),
  related_type  text not null check (related_type in ('claim','integrity','conduct','politician')),
  related_id    text not null,
  date          date not null,
  kind          text not null check (kind in ('correction','clarification','defence','denial','statement','no_response_located')),
  summary       text not null,
  quote         text,
  source_id     text references sources(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index responses_related_idx on responses(related_type, related_id);

-- ---------------------------------------------------------------------------
-- Integrity matters — separate record type with a lifecycle status
-- ---------------------------------------------------------------------------
create table integrity_matters (
  id                     text primary key,               -- 'int_0001'
  title                  text not null,
  politician_id          text not null references politicians(id),
  date                   date not null,
  organisation           text not null,
  description            text not null,
  status                 text not null check (status in ('allegation','referral','preliminary_assessment','formal_investigation','official_finding','referred_for_prosecution','charged','convicted','cleared','no_finding','dismissed','overturned_appealed')),
  status_history         jsonb not null default '[]'::jsonb,  -- [{status,date,note,sourceId}]
  primary_source_ids     text[] not null default '{}',
  independent_source_ids text[] not null default '{}',
  response_id            text references responses(id),
  outcome                text,
  last_checked_at        date not null,
  human_reviewed_at      date,                            -- required before publication
  is_demonstration       boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index integrity_matters_politician_idx on integrity_matters(politician_id);

-- ---------------------------------------------------------------------------
-- Serious conduct matters — strictest evidence rules
-- ---------------------------------------------------------------------------
create table conduct_matters (
  id                     text primary key,               -- 'cnd_0001'
  title                  text not null,
  politician_id          text not null references politicians(id),
  date                   date not null,
  allegation_summary     text not null,                  -- always attributed: "X publicly alleged that ..."
  status                 text not null check (status in ('allegation','police_report','police_investigation','civil_proceeding','criminal_charge','trial','conviction','acquittal','matter_withdrawn','no_charges_laid','investigation_closed','finding_overturned')),
  status_history         jsonb not null default '[]'::jsonb,
  evidence_basis         text not null check (evidence_basis in ('official_record','credible_reporting')),
  primary_source_ids     text[] not null default '{}',
  independent_source_ids text[] not null default '{}',
  response_id            text references responses(id),
  outcome                text,
  last_checked_at        date not null,
  human_reviewed_at      date,                            -- required before publication
  is_demonstration       boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index conduct_matters_politician_idx on conduct_matters(politician_id);

-- ---------------------------------------------------------------------------
-- Daily update feed
-- ---------------------------------------------------------------------------
create table daily_updates (
  id            text primary key,                        -- 'upd_2026-09-30-001'
  date          date not null,
  type          text not null check (type in ('new_claim','claim_updated','correction','investigation_opened','investigation_closed','new_official_finding','court_update','repeated_claim','conduct_update','profile_verified')),
  title         text not null,
  summary       text not null,
  related_type  text not null check (related_type in ('claim','integrity','conduct','politician')),
  related_id    text not null,
  politician_id text references politicians(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index daily_updates_date_idx on daily_updates(date desc);

-- ---------------------------------------------------------------------------
-- Review queue — AI drafts and public submissions wait here
-- ---------------------------------------------------------------------------
create table review_queue (
  id                    text primary key,                -- 'rev_0001'
  kind                  text not null check (kind in ('ai_discovery','public_submission','politician_response','evidence_update')),
  status                text not null default 'pending' check (status in ('pending','approved','edited','rejected','needs_evidence','duplicate')),
  target_type           text not null check (target_type in ('claim','integrity','conduct','politician')),
  target_id             text,
  politician_id         text references politicians(id),
  submitted_at          timestamptz not null default now(),
  submitted_by          text not null,
  claim_text            text not null,
  suggested_status      text,
  ai_explanation        text not null,
  sources               jsonb not null default '[]'::jsonb,   -- [{url,title,publisher,tier,qualityNote}]
  contradictory_sources jsonb not null default '[]'::jsonb,
  similar_claims        jsonb not null default '[]'::jsonb,   -- [{claimId,similarity}]
  risk_flags            text[] not null default '{}',
  requires_human_review boolean not null default true,
  reviewer_notes        text,
  reviewed_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- Serious matters can never bypass human review.
  check (target_type not in ('integrity','conduct') or requires_human_review)
);
create index review_queue_status_idx on review_queue(status, submitted_at desc);

-- ---------------------------------------------------------------------------
-- Change log — PUBLIC RECORD's own corrections. Append-only.
-- ---------------------------------------------------------------------------
create table change_log (
  id             text primary key,                       -- 'chg_0001'
  date           date not null,
  kind           text not null check (kind in ('classification_changed','evidence_added','record_created','record_amended','status_changed','response_added','profile_updated')),
  record_type    text not null check (record_type in ('claim','integrity','conduct','politician')),
  record_id      text not null,
  politician_id  text references politicians(id),
  summary        text not null,
  previous_value text,
  new_value      text,
  reason         text not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index change_log_record_idx on change_log(record_type, record_id);

-- Prevent edits and deletes on the change log.
create or replace function change_log_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'change_log is append-only';
end $$;
create trigger change_log_no_update before update or delete on change_log for each row execute function change_log_append_only();

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['parties','politicians','sources','issues','claims','claim_assessments','claim_sources','claim_repetitions','corrections','responses','integrity_matters','conduct_matters','daily_updates','review_queue']
  loop
    execute format('create trigger %I_set_updated_at before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row-level security (Supabase): public read of published records,
-- writes only through the service role used by the pipeline and reviewers.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['parties','politicians','sources','issues','claims','claim_issues','claim_assessments','claim_sources','claim_repetitions','corrections','responses','integrity_matters','conduct_matters','daily_updates','change_log']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I_public_read on %I for select using (true)', t, t);
  end loop;
end $$;
alter table review_queue enable row level security;
-- Anyone may submit; only the service role may read or decide (reviewer UI runs server-side).
create policy review_queue_public_insert on review_queue for insert with check (kind in ('public_submission','politician_response'));
