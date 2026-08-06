-- ─────────────────────────────────────────────────────────────────────────────
-- 0006_extend_retention_log
--
-- Extends retention_log to cover the staging-stack manual cleanup story
-- introduced in Phase 3 (Decision #4 on issue #18).
--
-- Why extend instead of creating a separate cleanup_log:
--
--   retention_log already has the right shape — append-only, no FK
--   cascades, RLS enabled, service-role-only. It's already the answer to
--   "what's been deleted from this slug?" Adding manual-cleanup rows
--   alongside cron-purge rows keeps that single query useful.
--
-- What's added:
--
--   environment              — 'production' | 'staging'. Defaults to
--                              'production' so existing rows from the
--                              cron-purge code path back-compat cleanly.
--                              Manual staging cleanup writes 'staging'.
--
--   operation                — 'cron_purge' | 'manual_cleanup'.
--                              Defaults to 'cron_purge'. Distinguishes
--                              the time-based cron purge from the
--                              operator-triggered nuke-this-event-now
--                              path. 'reason' (existing column) stays
--                              for "what triggered the operation"
--                              ('scheduled' vs 'manual'); 'operation'
--                              is "what kind of operation was it."
--
--   invited_attendees_deleted — count of rows removed from
--                              invited_attendees. Cron purge today
--                              doesn't touch invited_attendees (only
--                              rsvps + cascade audit), so the column
--                              defaults to 0 for back-compat. Manual
--                              cleanup deletes both, so this captures
--                              the count.
--
-- What's NOT added:
--
--   triggered_by — already exists in 0004. Don't re-add.
--
--   threshold_iso — kept NOT NULL for now. Manual cleanup writes the
--                   `now()` timestamp here as a sentinel meaning "no
--                   threshold; this is a clean-now operation." If a
--                   future migration wants to make threshold_iso
--                   nullable that's a separate change. For now the
--                   sentinel keeps the schema strict.
--
-- Idempotency:
--
--   Uses `add column if not exists` so re-running on a DB that already
--   has these columns is safe. Production runs this migration at the
--   next convenient deploy window; staging runs it during initial
--   project setup (Phase 8.1 of the runbook).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.retention_log
  add column if not exists environment text not null default 'production'
    check (environment in ('production', 'staging'));

alter table public.retention_log
  add column if not exists operation text not null default 'cron_purge'
    check (operation in ('cron_purge', 'manual_cleanup'));

alter table public.retention_log
  add column if not exists invited_attendees_deleted integer not null default 0;

create index if not exists idx_retention_log_env_op
  on public.retention_log (environment, operation, purged_at desc);

comment on column public.retention_log.environment is
  'production | staging. Default production so existing cron-purge rows back-compat.';

comment on column public.retention_log.operation is
  'cron_purge | manual_cleanup. Distinguishes time-based cron from operator-triggered cleanup_event_data calls.';

comment on column public.retention_log.invited_attendees_deleted is
  'Rows removed from invited_attendees. Cron purge does not touch invited_attendees today (defaults to 0). Manual cleanup deletes both rsvps and invited_attendees.';
