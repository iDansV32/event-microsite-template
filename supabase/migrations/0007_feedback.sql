-- ─────────────────────────────────────────────────────────────────────────────
-- 0007_feedback
--
-- Storage for the Tally-backed feedback section (M5 prototype):
--
--   feedback_responses    — append-only copy of Tally form submissions,
--                           written by /api/webhooks/tally with the
--                           service-role key AFTER HMAC signature
--                           verification. Tally remains the durable
--                           upstream copy (its dashboard retains all
--                           submissions and supports manual redelivery),
--                           so rows here are the queryable mirror, not
--                           the only copy.
--
--   feedback_email_sends  — append-only send ledger for the "share your
--                           feedback" transactional email, written by
--                           /api/internal/<slug>/feedback-emails. The
--                           unique (event_slug, lower(email)) index is
--                           what makes the send route repeat-call-safe:
--                           re-invoking it skips everyone already
--                           ledgered, so an operator can re-POST after a
--                           timeout without double-sending.
--
-- Idempotency: Tally retries webhook deliveries on non-2xx (5m/30m/1h/
-- 6h/1d) and supports manual redelivery. The unique index on
-- tally_submission_id collapses duplicate deliveries AND replayed
-- captures into a 200 no-op at the route layer.
--
-- Retention: both tables contain attendee-derived data (free-text
-- answers may contain anything; the ledger contains emails). Both are
-- purged by the existing event-anchored retention cron alongside rsvps;
-- the count of purged responses lands in retention_log.feedback_deleted
-- (added below).
--
-- Access policy: RLS enabled, no policies. Service-role only. Same
-- pattern as rsvps + invited_attendees + retention_log.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

create table if not exists public.feedback_responses (
  id                   uuid primary key default gen_random_uuid(),
  event_slug           text not null,
  tally_form_id        text not null,
  tally_event_id       text not null,
  tally_submission_id  text not null,
  respondent_token     text,
  submitted_at         timestamptz,
  payload              jsonb not null,
  received_at          timestamptz not null default now()
);

-- Idempotency: duplicate webhook deliveries / replays collapse here.
create unique index if not exists idx_feedback_responses_submission
  on public.feedback_responses (tally_submission_id);

create index if not exists idx_feedback_responses_event
  on public.feedback_responses (event_slug, received_at desc);

alter table public.feedback_responses enable row level security;

comment on table public.feedback_responses is
  'Append-only mirror of Tally feedback submissions, written by /api/webhooks/tally (service role) after HMAC verification. No FK to events — event_slug is text, like rsvps. Purged by the retention cron.';
comment on column public.feedback_responses.respondent_token is
  'Pseudonymous HMAC of (slug, attendee email) passed through Tally hidden fields (lib/feedback/respondent.ts). Travels via the iframe URL, so it is respondent-tamperable — treat as an attribution hint, never as identity or auth.';
comment on column public.feedback_responses.payload is
  'The entire verified webhook payload (including data.fields and hidden fields) for fidelity and forensics. The typed columns are the extraction; this is the source of truth if extraction logic ever drifts.';

create table if not exists public.feedback_email_sends (
  id          uuid primary key default gen_random_uuid(),
  event_slug  text not null,
  email       text not null,
  sent_at     timestamptz not null default now(),
  sent_by     text not null
);

-- One feedback email per attendee per event. The send route treats a
-- ledgered row as "skip" — this is the accidental-double-send guard.
create unique index if not exists idx_feedback_email_sends_event_email
  on public.feedback_email_sends (event_slug, lower(email));

alter table public.feedback_email_sends enable row level security;

comment on table public.feedback_email_sends is
  'Append-only ledger of feedback-email sends, written by /api/internal/<slug>/feedback-emails (service role). Contains PII (emails) — purged with the event by the retention cron. sent_by records the organizer session email that triggered the send.';

alter table public.retention_log
  add column if not exists feedback_deleted integer not null default 0;

comment on column public.retention_log.feedback_deleted is
  'Rows removed from feedback_responses by this purge. Ledger rows (feedback_email_sends) are deleted in the same call but not separately counted. Defaults 0 for pre-0007 rows.';
