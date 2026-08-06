import "server-only";

import { getSupabaseServer } from "../supabase";
import {
  getActiveInviteWithClient,
  getInviteWithClient,
  listInvitesForEventWithClient,
  upsertInviteWithClient,
} from "./storage-core";
import { InviteStorageError } from "./storage-error";
import type {
  InvitedAttendeeInsert,
  InvitedAttendeeRow,
} from "../supabase.types";

/**
 * Typed helpers over invited_attendees. Writes use the service-role
 * client (bypasses RLS — the table has deny-all policies).
 *
 * Email is always normalised to lowercase at write time. Reads defensively
 * normalise too, same pattern as lib/rsvp/storage.
 */

const TABLE = "invited_attendees";

/**
 * Fetch the invite for (slug, email). Excludes rows whose revoked_at is
 * non-null — revoked invites are treated as if they don't exist for the
 * login path.
 */
export async function getActiveInvite(
  slug: string,
  email: string,
): Promise<InvitedAttendeeRow | null> {
  const supabase = getSupabaseServer();
  return getActiveInviteWithClient(supabase, slug, email);
}

/**
 * Load the invite by slug+email regardless of revoked_at. Used by
 * revocation checks where we want to treat a revoked row as "denied"
 * rather than "missing" (so we can redirect the attendee to a clear
 * message instead of the generic login page).
 */
export async function getInvite(
  slug: string,
  email: string,
): Promise<InvitedAttendeeRow | null> {
  const supabase = getSupabaseServer();
  return getInviteWithClient(supabase, slug, email);
}

/**
 * List all invited attendees for an event, ordered by invited_at. Used by
 * the internal roster view. Respects revocation via the `includeRevoked`
 * flag.
 */
export async function listInvitesForEvent(
  slug: string,
  opts: { includeRevoked?: boolean } = {},
): Promise<InvitedAttendeeRow[]> {
  const supabase = getSupabaseServer();
  return listInvitesForEventWithClient(supabase, slug, opts);
}

/**
 * Idempotent invite upsert implemented as read-then-write rather than
 * Postgres `ON CONFLICT`. Why:
 *
 *   The uniqueness invariant is `(event_slug, lower(email))`, which we
 *   enforce with a FUNCTIONAL unique index (see migration 0002). Postgres
 *   can't target a functional index from PostgREST/Supabase's
 *   `onConflict` column-list syntax — it expects a conflict target that
 *   maps to a constraint or a plain-column unique index. Read-then-write
 *   sidesteps that entirely and also matches the pattern already used
 *   for rsvps (lib/rsvp/storage → upsertRsvp).
 *
 * Flow:
 *
 *   1. Read by (event_slug, lower(email)).
 *   2. If present → UPDATE first_name/last_name/role. `session_version`
 *      is INTENTIONALLY left untouched so re-seeding doesn't log
 *      everyone out.
 *   3. If absent → INSERT. A unique-violation race (two concurrent
 *      seeds) falls back to the update path once, covering the
 *      narrow window between read and insert.
 */
export async function upsertInvite(
  row: Omit<InvitedAttendeeInsert, "email"> & { email: string },
): Promise<InvitedAttendeeRow> {
  const supabase = getSupabaseServer();
  return upsertInviteWithClient(supabase, row);
}

/**
 * Bump session_version, invalidating every outstanding session cookie for
 * this attendee. Used by admin tooling to kick someone out without
 * deleting the row.
 */
export async function revokeInviteSession(
  id: string,
  slug: string,
): Promise<InvitedAttendeeRow> {
  const supabase = getSupabaseServer();
  const existing = await supabase
    .from(TABLE)
    .select("session_version")
    .eq("id", id)
    .eq("event_slug", slug)
    .maybeSingle();
  if (existing.error) {
    throw new InviteStorageError("db_error", existing.error.message);
  }
  if (!existing.data) throw new InviteStorageError("not_found", "Invite not found.");
  const current = existing.data as { session_version: number };
  const { data, error } = await supabase
    .from(TABLE)
    .update({ session_version: current.session_version + 1 } as never)
    .eq("id", id)
    .eq("event_slug", slug)
    .select("*")
    .single();
  if (error) throw new InviteStorageError("db_error", error.message);
  return data as InvitedAttendeeRow;
}
