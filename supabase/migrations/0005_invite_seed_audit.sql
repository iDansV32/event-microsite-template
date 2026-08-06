-- ─────────────────────────────────────────────────────────────────────────────
-- 0005_invite_seed_audit
--
-- Append-only audit trail for staging-stack invite seeds that bypassed the
-- STAGING_EMAIL_ALLOWED_DOMAINS guardrail via explicit operator override.
--
-- Design intent (per Phase 3 Decision #3 on issue #18):
--
--   The default behavior of `seed_event_invites(slug, "staging", ref)` is to
--   reject any email in the entry list whose domain isn't in
--   STAGING_EMAIL_ALLOWED_DOMAINS. An operator who has a legitimate reason
--   to seed an external address (e.g., a client stakeholder wants to
--   preview the RSVP form before the event merges to main) can override on
--   a per-email basis. Each override writes a row here.
--
--   Authorization is via WEBEXEC_STAGING_OVERRIDE_ALLOWED_USERS — a
--   dedicated allowlist separate from the github-tools allowlist, so
--   create-event access does NOT automatically grant override authority.
--
-- What's recorded:
--
--   email          — the external recipient that bypassed the guardrail
--   role           — what role they were seeded as (typically attendee/
--                    guest, occasionally organizer for cross-org demos)
--   reason         — operator-supplied justification (NOT NULL — the
--                    whole point is requiring intent)
--   overridden_by  — the calling webexec user (from auth context)
--   ref            — git ref / branch the seed ran against (e.g.
--                    "csl-preview/acme-2027-xk7p3")
--   commit_sha     — specific commit of events/<slug>/invites.ts at
--                    seed time. Together with `ref` this closes the
--                    forensic loop: the audit row links back to the
--                    exact invites.ts content that introduced this
--                    email.
--   environment    — locked to 'staging' in v1; production-side override
--                    auditing is a separate decision if/when production
--                    seeding via this surface ever happens.
--
-- Append-only by convention:
--
--   No DELETE statements anywhere in app code. Survives both auto-purge
--   (extended retention_log cron in 0006) and manual cleanup_event_data.
--   The override trail must outlive the data it audited; otherwise an
--   investigation has nothing to read when it needs it.
--
--   Same pattern as retention_log: no FK to invited_attendees, no
--   cascading references. Rows survive cascade deletes by design.
--
-- Access policy: RLS enabled, no policies. Service-role only. Same
-- pattern as rsvps + invited_attendees + retention_log.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

create table if not exists public.invite_seed_audit (
  id              uuid primary key default gen_random_uuid(),
  event_slug      text not null,
  email           text not null,
  role            text not null check (role in ('attendee', 'organizer', 'guest')),
  reason          text not null check (length(trim(reason)) > 0),
  overridden_by   text not null,
  overridden_at   timestamptz not null default now(),
  environment     text not null check (environment = 'staging'),
  ref             text,
  commit_sha      text
);

create index if not exists idx_invite_seed_audit_event
  on public.invite_seed_audit (event_slug, overridden_at desc);

create index if not exists idx_invite_seed_audit_email
  on public.invite_seed_audit (lower(email));

alter table public.invite_seed_audit enable row level security;

comment on table public.invite_seed_audit is
  'Append-only audit trail of external-attendee seed overrides on the staging stack. Service-role-only writes from the seed_event_invites MCP tool. No DELETE — rows must outlive the data they audited.';
