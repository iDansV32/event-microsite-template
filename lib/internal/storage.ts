import "server-only";

import { listInvitesForEvent } from "../auth/storage";
import { listRsvpsForEvent } from "../rsvp/storage";
import type {
  InvitedAttendeeRow,
  RsvpRow,
  RsvpStatus,
} from "../supabase.types";

/**
 * Roster rows shown on /internal/[slug]. Built server-side by joining
 * invited_attendees with rsvps on (event_slug, lower(email)).
 *
 *   pending   invited, not revoked, no RSVP on file
 *   yes / no  invited, not revoked, RSVP answered
 *   revoked   invite.revoked_at is non-null. This supersedes any RSVP
 *             state — a revoked attendee's previous answer still lives
 *             in the row for audit, but they are NOT counted as
 *             pending/confirmed/declined and are excluded from reminder
 *             outreach. Without this distinction a revoked person would
 *             silently slip back into the "Copy N pending emails"
 *             clipboard output.
 *   orphan    RSVP row with no matching invite. Shouldn't happen post-
 *             M3 auth, but we surface rather than hide so organizers
 *             can investigate.
 */

export type RosterStatus = "pending" | RsvpStatus | "revoked" | "orphan";

export interface RosterEntry {
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: InvitedAttendeeRow["role"] | null;
  status: RosterStatus;
  plusOne: boolean;
  plusOneName: string | null;
  dietary: string[] | null;
  dietaryOther: string | null;
  tshirt: string | null;
  roommate: string | null;
  arrivalNote: string | null;
  emergencyContact: string | null;
  invitedAt: string | null;
  rsvpCreatedAt: string | null;
  rsvpUpdatedAt: string | null;
  revokedAt: string | null;
}

export interface RosterData {
  entries: RosterEntry[];
  stats: {
    /** Total invite rows, including revoked ones (matches table count). */
    invited: number;
    /** Non-revoked invites only, the denominator organizers care about. */
    active: number;
    rsvpd: number;
    confirmed: number;
    declined: number;
    /** Active + no RSVP. Does NOT include revoked attendees. */
    pending: number;
    revoked: number;
    orphans: number;
    dietaryFlagged: number;
    organizers: number;
  };
}

/**
 * Read the full roster for an event. Two queries, in-memory join.
 *
 * Keeping the join out of SQL means a single blip doesn't cascade — if
 * rsvps fails we can still show the invited list with everyone marked
 * "pending". listInvitesForEvent and listRsvpsForEvent propagate their
 * errors; callers at the route level decide whether to degrade or 500.
 */
export async function loadRoster(slug: string): Promise<RosterData> {
  const [invites, rsvps] = await Promise.all([
    listInvitesForEvent(slug, { includeRevoked: true }),
    listRsvpsForEvent(slug),
  ]);

  const rsvpByEmail = new Map<string, RsvpRow>();
  for (const r of rsvps) rsvpByEmail.set(r.email.toLowerCase(), r);

  const entries: RosterEntry[] = invites.map((inv) => {
    const rsvp = rsvpByEmail.get(inv.email);
    rsvpByEmail.delete(inv.email); // mark as matched so orphans fall through
    // Revocation beats RSVP state — a revoked attendee's historical
    // answer is preserved in the other fields but their status is
    // "revoked" so they drop out of pending / confirmed / declined
    // counts and reminder flows.
    const status: RosterStatus = inv.revoked_at
      ? "revoked"
      : (rsvp?.attending ?? "pending");
    return {
      email: inv.email,
      firstName: inv.first_name,
      lastName: inv.last_name,
      role: inv.role,
      status,
      plusOne: rsvp?.plus_one ?? false,
      plusOneName: rsvp?.plus_one_name ?? null,
      dietary: rsvp?.dietary ?? null,
      dietaryOther: rsvp?.dietary_other ?? null,
      tshirt: rsvp?.tshirt ?? null,
      roommate: rsvp?.roommate ?? null,
      arrivalNote: rsvp?.arrival_note ?? null,
      emergencyContact: rsvp?.emergency_contact ?? null,
      invitedAt: inv.invited_at,
      rsvpCreatedAt: rsvp?.created_at ?? null,
      rsvpUpdatedAt: rsvp?.updated_at ?? null,
      revokedAt: inv.revoked_at,
    };
  });

  // Anything left in rsvpByEmail is an orphan RSVP with no invite row.
  for (const rsvp of rsvpByEmail.values()) {
    entries.push({
      email: rsvp.email,
      firstName: rsvp.first_name,
      lastName: rsvp.last_name,
      role: null,
      status: "orphan",
      plusOne: rsvp.plus_one,
      plusOneName: rsvp.plus_one_name,
      dietary: rsvp.dietary,
      dietaryOther: rsvp.dietary_other,
      tshirt: rsvp.tshirt,
      roommate: rsvp.roommate,
      arrivalNote: rsvp.arrival_note,
      emergencyContact: rsvp.emergency_contact,
      invitedAt: null,
      rsvpCreatedAt: rsvp.created_at,
      rsvpUpdatedAt: rsvp.updated_at,
      revokedAt: null,
    });
  }

  const active = invites.filter((i) => !i.revoked_at).length;
  const stats = {
    invited: invites.length,
    active,
    rsvpd: entries.filter((e) => e.status === "yes" || e.status === "no").length,
    confirmed: entries.filter((e) => e.status === "yes").length,
    declined: entries.filter((e) => e.status === "no").length,
    pending: entries.filter((e) => e.status === "pending").length,
    revoked: entries.filter((e) => e.status === "revoked").length,
    orphans: entries.filter((e) => e.status === "orphan").length,
    dietaryFlagged: entries.filter(
      (e) =>
        e.status !== "revoked" &&
        ((e.dietary && e.dietary.length > 0) || e.dietaryOther),
    ).length,
    organizers: entries.filter(
      (e) => e.role === "organizer" && e.status !== "revoked",
    ).length,
  };

  return { entries, stats };
}
