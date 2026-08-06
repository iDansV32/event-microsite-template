import { z } from "zod";

/**
 * One entry in an `events/<slug>/invites.ts` seed file. The file is the
 * AUTHORING surface — CSLs add/remove emails in Git. The runtime source
 * of truth is the `invited_attendees` Supabase table, populated by
 * scripts/seed-invites.ts which reads these entries and upserts.
 */
export const InviteRole = z.enum(["attendee", "organizer", "guest"]);
export type InviteRole = z.infer<typeof InviteRole>;

export const InviteSeedEntry = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  role: InviteRole.default("attendee"),
});

export type InviteSeedEntry = z.infer<typeof InviteSeedEntry>;

export const InviteSeed = z.object({
  entries: z.array(InviteSeedEntry).min(1),
});

export type InviteSeed = z.infer<typeof InviteSeed>;

// ─── API inputs ────────────────────────────────────────────────────────────

export const LoginInput = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  /** Optional in-site path to redirect to after successful verify. Validated
      against a safe-path allowlist on the server, never trusted raw. */
  next: z.string().max(512).optional(),
});

export type LoginInput = z.infer<typeof LoginInput>;
