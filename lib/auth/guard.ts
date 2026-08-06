import "server-only";

import { readSessionCookie } from "./session";
import { getInvite } from "./storage";
import type { SessionPayload } from "./token";
import type { InvitedAttendeeRow } from "../supabase.types";

/**
 * Shared session + invite + revocation check used by every gated surface:
 *
 *   - /e/[slug]/layout.tsx (replaces the old enforceRevocation helper)
 *   - /e/[slug]/registration/page.tsx (server component)
 *   - /api/rsvp/[slug]/route.ts (POST handler)
 *
 * Having the check here means there is exactly ONE code path that
 * decides whether a request belongs to an active attendee: cookie
 * signature-and-expiry, invite row exists, invite.revoked_at is null,
 * invite.session_version matches the cookie's version. Callers
 * dispatch on the failure reason to decide UX (redirect vs 401 JSON).
 *
 * `db_error` is its own reason so callers can degrade gracefully
 * (e.g. the layout lets middleware-verified sessions through on a
 * Supabase blip) rather than conflating transient infra errors with
 * actual authorization failures.
 */

export type EventAuthFailure =
  | { ok: false; reason: "no_session" }
  | { ok: false; reason: "no_invite" }
  | { ok: false; reason: "revoked" }
  | { ok: false; reason: "version_mismatch" }
  | { ok: false; reason: "not_organizer" }
  | { ok: false; reason: "db_error"; error: unknown };

export interface EventAuthSuccess {
  ok: true;
  session: SessionPayload;
  invite: InvitedAttendeeRow;
}

export type EventAuthResult = EventAuthSuccess | EventAuthFailure;

export async function authorizeEventRequest(
  slug: string,
  cookies: { get: (name: string) => { value: string } | undefined },
): Promise<EventAuthResult> {
  const session = await readSessionCookie(cookies, slug);
  if (!session) return { ok: false, reason: "no_session" };

  let invite: InvitedAttendeeRow | null;
  try {
    invite = await getInvite(slug, session.email);
  } catch (err) {
    return { ok: false, reason: "db_error", error: err };
  }

  if (!invite) return { ok: false, reason: "no_invite" };
  if (invite.revoked_at) return { ok: false, reason: "revoked" };
  if (invite.session_version !== session.version) {
    return { ok: false, reason: "version_mismatch" };
  }

  return { ok: true, session, invite };
}

/**
 * Same as authorizeEventRequest, but also rejects with reason
 * "not_organizer" unless invite.role === "organizer". Used by every
 * gated surface under /internal/* and /api/internal/* to replace the
 * M1-era shared Basic Auth creds with per-person organizer-role checks.
 *
 * The underlying guard still runs first, so a revoked organizer gets
 * "revoked" (more specific) rather than "not_organizer" — matches the
 * UX the /e/<slug>/* tree already shows.
 */
export async function authorizeOrganizerRequest(
  slug: string,
  cookies: { get: (name: string) => { value: string } | undefined },
): Promise<EventAuthResult> {
  const auth = await authorizeEventRequest(slug, cookies);
  if (!auth.ok) return auth;
  if (auth.invite.role !== "organizer") {
    return { ok: false, reason: "not_organizer" };
  }
  return auth;
}
