-- ─────────────────────────────────────────────────────────────────────────────
-- 0003_drop_rsvp_edit_token_columns
--
-- Retire the RSVP edit-token columns. Background:
--
--   The original M2 RSVP flow emailed signed HMAC tokens in
--   /e/<slug>/registration?t=... URLs so attendees could edit their
--   response from a new device without being logged in. When M3 shipped
--   full-site magic-link auth, that URL became unreachable without a
--   session (middleware redirects unauthenticated users to login), and
--   the registration page never actually called verifyRsvpToken — it
--   just read the RSVP off session email.
--
--   Code-side cleanup landed in the same commit as this migration:
--   lib/rsvp/token.ts deleted, bumpTokenVersionIfMatch /
--   regenerateRsvpToken removed, token_version / token_expires_at
--   dropped from TS types. Nothing reads or writes these columns
--   anymore.
--
-- Safety:
--
--   - Columns are NOT referenced by any FK, index, trigger, or constraint
--     other than the NOT NULL on token_expires_at, which goes away with
--     the column.
--   - idx_rsvps_event_email_unique and idx_rsvps_event_slug are on
--     (event_slug, lower(email)) and (event_slug) respectively — not
--     touched.
--   - The rsvp_audit.action CHECK constraint still permits 'token_regen'
--     so pre-migration audit rows remain valid. New code no longer
--     emits that action value.
--
-- Rollback: not supported via an automatic down-migration. If ever
-- needed, re-add the columns and decide a default value strategy.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.rsvps
  drop column if exists token_version,
  drop column if exists token_expires_at;
