import type { z } from "zod";
import type { InviteSeed } from "@/lib/schemas";

/**
 * AUTHORING surface for the allowlist. The runtime source of truth is the
 * invited_attendees Supabase table — this file is read by
 * scripts/seed-invites.ts and upserted into the DB. Editing here does
 * not grant access until the seed script runs.
 *
 * Organizers get role "organizer"; everyone else is "attendee". Plus-ones
 * or external speakers who aren't on the client roster get "guest".
 *
 * These are invented addresses on example.com. Replace them with real
 * ones before seeding anything you expect to grant access.
 */
export const invites = {
  entries: [
    { email: "organizer@example.com", role: "organizer" },
    { email: "attendee@example.com" },
  ],
} satisfies z.input<typeof InviteSeed>;
