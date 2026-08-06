-- ─────────────────────────────────────────────────────────────────────────────
-- 0002_invited_attendees — M3 auth schema
--
-- Per-event allowlist that drives magic-link login. A row here means:
--
--   1. (event_slug, email) can request a magic link and log into the event.
--   2. A session cookie pointing at this row is valid for full-site access
--      under /e/<event_slug>/*.
--   3. The role column is the gate for organizer-only surfaces (/internal/*
--      migration happens after M3-B; Basic Auth stays as overlap).
--
-- Revocation model: `session_version` is the per-attendee revocation lever.
-- Bumping it invalidates every outstanding session cookie issued against
-- the row — middleware + the event layout check cookie.session_version
-- against the DB on each request. `revoked_at` is the full kill switch
-- (soft-delete; middleware treats any non-null revoked_at as no access).
--
-- Access policy: same as rsvps — RLS enabled, no policies. Writes go
-- through the service-role client from server actions and API routes.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.invited_attendees (
  id                uuid primary key default gen_random_uuid(),
  event_slug        text not null,
  email             text not null,
  first_name        text,
  last_name         text,
  role              text not null default 'attendee'
                      check (role in ('attendee', 'organizer', 'guest')),
  session_version   integer not null default 1,
  invited_at        timestamptz not null default now(),
  revoked_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Case-insensitive uniqueness — same pattern as rsvps. The application
-- layer normalises email to lowercase at write time; this index makes
-- the invariant enforceable even if a future writer forgets.
create unique index if not exists idx_invited_event_email_unique
  on public.invited_attendees (event_slug, lower(email));

-- Fast scan for the internal roster view (M3 organizers + M2-D).
create index if not exists idx_invited_event_slug
  on public.invited_attendees (event_slug);

-- Active-only queries: common in middleware revocation checks.
create index if not exists idx_invited_active_lookup
  on public.invited_attendees (event_slug, lower(email))
  where revoked_at is null;

-- updated_at trigger (shares the function from 0001).
drop trigger if exists invited_attendees_touch_updated_at
  on public.invited_attendees;

create trigger invited_attendees_touch_updated_at
  before update on public.invited_attendees
  for each row execute function public.touch_updated_at();

-- RLS enabled, deny-all default (service role bypasses).
alter table public.invited_attendees enable row level security;

comment on table public.invited_attendees is
  'Per-event allowlist for magic-link login. Writes via service-role; RLS denies anon/authenticated by default.';

comment on column public.invited_attendees.session_version is
  'Revocation lever: bump to invalidate every outstanding session cookie for this attendee.';

comment on column public.invited_attendees.revoked_at is
  'Soft-delete. Non-null means access is denied regardless of session_version.';
