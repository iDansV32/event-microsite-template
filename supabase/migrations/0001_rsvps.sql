-- ─────────────────────────────────────────────────────────────────────────────
-- 0001_rsvps — initial M2 schema
--
-- rsvps         persisted RSVPs, keyed by (event_slug, email).
-- rsvp_audit    append-only log of every write for forensics.
--
-- Access policy: NO anon/authenticated policies. All reads and writes go
-- through the server-side Supabase client (service role) in
-- app/api/rsvp/* and app/internal/*. RLS is still enabled so any future
-- accidental anon-key client is denied by default.
-- ─────────────────────────────────────────────────────────────────────────────

-- Extensions --------------------------------------------------------------

create extension if not exists "pgcrypto";   -- gen_random_uuid

-- Tables ------------------------------------------------------------------

create table if not exists public.rsvps (
  id                 uuid primary key default gen_random_uuid(),
  event_slug         text not null,
  first_name         text not null,
  last_name          text not null,
  email              text not null,
  attending          text not null check (attending in ('yes', 'no')),
  plus_one           boolean not null default false,
  plus_one_name      text,
  dietary            text[],
  dietary_other      text,
  tshirt             text,
  roommate           text,
  arrival_note       text,
  emergency_contact  text,
  token_version      integer not null default 1,
  token_expires_at   timestamptz not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Attendee identity is case-insensitive: `Alice@acme.com` and
-- `alice@acme.com` are the same person. Enforcing uniqueness via a
-- functional index on lower(email) means the database rejects duplicate
-- casings even if the application layer ever forgets to normalise.
-- This doubles as the fast lookup path for the token-regen flow.
create unique index if not exists idx_rsvps_event_email_unique
  on public.rsvps (event_slug, lower(email));

create index if not exists idx_rsvps_event_slug
  on public.rsvps (event_slug);

create index if not exists idx_rsvps_attending
  on public.rsvps (event_slug, attending);

-- updated_at trigger ------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rsvps_touch_updated_at on public.rsvps;

create trigger rsvps_touch_updated_at
  before update on public.rsvps
  for each row execute function public.touch_updated_at();

-- Audit log ---------------------------------------------------------------

create table if not exists public.rsvp_audit (
  id          uuid primary key default gen_random_uuid(),
  rsvp_id     uuid not null references public.rsvps(id) on delete cascade,
  event_slug  text not null,
  action      text not null check (action in ('create', 'update', 'token_regen', 'purge')),
  actor       text,
  before      jsonb,
  after       jsonb,
  at          timestamptz not null default now()
);

create index if not exists idx_rsvp_audit_rsvp
  on public.rsvp_audit (rsvp_id);

create index if not exists idx_rsvp_audit_event
  on public.rsvp_audit (event_slug);

create index if not exists idx_rsvp_audit_at
  on public.rsvp_audit (at desc);

-- Row-Level Security ------------------------------------------------------
-- Enabled but with NO policies. Supabase defaults to deny-all in this
-- state, which is exactly what we want: the service-role key bypasses
-- RLS (that's how our server writes), and any stray anon/authenticated
-- request is rejected.

alter table public.rsvps      enable row level security;
alter table public.rsvp_audit enable row level security;

-- Helpful comment for future maintainers ----------------------------------

comment on table public.rsvps is
  'Event RSVPs. Writes go through app/api/rsvp/* with the service-role key. RLS denies anon/authenticated by default.';

comment on table public.rsvp_audit is
  'Append-only audit log of RSVP writes. Populated by server actions, never by clients.';
