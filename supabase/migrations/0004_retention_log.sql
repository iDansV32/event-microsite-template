-- ─────────────────────────────────────────────────────────────────────────────
-- 0004_retention_log
--
-- Evidence trail for M2-E retention purges. One row per (event_slug,
-- purge run) summarizing what got deleted.
--
-- Why a separate table (vs. an action='purge' row in rsvp_audit):
--
--   rsvp_audit rows have a FK to rsvps.id with on-delete-cascade, so any
--   audit row describing the purge would ITSELF be cascade-deleted by
--   the purge it describes. retention_log has NO foreign keys and no
--   cascading references, so it survives the very deletion it's
--   attesting to. That's the point.
--
-- What's recorded:
--
--   threshold_iso   — the computed "purge everything from before this
--                     timestamp" threshold for the event (event end +
--                     retention days). Kept alongside rsvps_deleted so
--                     an auditor can reconstruct the policy in effect
--                     at purge time without needing the event content
--                     file in git history.
--   rsvps_deleted   — exact count returned by the DELETE ... RETURNING.
--   audit_deleted   — count of rsvp_audit rows queried BEFORE the
--                     cascade. See lib/rsvp/storage.ts for the
--                     small concurrency window this leaves.
--   reason          — "scheduled" for cron, "manual" for operator-
--                     triggered.
--   triggered_by    — free-text tag, e.g. "vercel-cron" or an ops name.
--
-- Access policy: RLS enabled, no policies. Service-role only, same
-- pattern as rsvps + invited_attendees.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

create table if not exists public.retention_log (
  id             uuid primary key default gen_random_uuid(),
  event_slug     text not null,
  purged_at      timestamptz not null default now(),
  threshold_iso  timestamptz not null,
  rsvps_deleted  integer not null,
  audit_deleted  integer not null,
  reason         text not null check (reason in ('scheduled', 'manual')),
  triggered_by   text
);

create index if not exists idx_retention_log_event
  on public.retention_log (event_slug, purged_at desc);

alter table public.retention_log enable row level security;

comment on table public.retention_log is
  'Evidence trail of M2-E retention purges. No FK to rsvps so rows survive cascade deletes. Writes via service-role from /api/cron/purge-retention.';
