import { z } from "zod";

/**
 * Input shape for the RSVP POST handler. Parsed once at the route boundary;
 * everything downstream (storage upsert, audit log) works off the output
 * type, which is already normalised (email lowercased, strings trimmed,
 * empty optionals dropped).
 */

// Keep the T-shirt enum in one place; reused by the UI later.
export const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export const TShirtSize = z.enum(TSHIRT_SIZES);
export type TShirtSize = z.infer<typeof TShirtSize>;

const optionalTrimmedString = z
  .string()
  .trim()
  .transform((s) => (s.length === 0 ? undefined : s))
  .optional();

/**
 * Body schema for POST /api/rsvp/[slug]. Identity (email, first/last name)
 * is NOT in the body — it comes from the session cookie and the invited
 * attendee row server-side. Writing identity from the body was the vector
 * where a transient Supabase blip on page render could cause placeholder
 * "—" names to be persisted. Now the server derives identity directly.
 */
export const RsvpInput = z.object({
  attending: z.enum(["yes", "no"]),
  plusOne: z.boolean().optional().default(false),
  plusOneName: optionalTrimmedString,
  dietary: z.array(z.string().trim().min(1)).max(16).optional(),
  dietaryOther: optionalTrimmedString,
  tshirt: TShirtSize.optional(),
  roommate: optionalTrimmedString,
  arrivalNote: optionalTrimmedString,
  emergencyContact: optionalTrimmedString,
});

export type RsvpInput = z.infer<typeof RsvpInput>;

/**
 * Identity an authenticated caller contributes to an RSVP write.
 * Server-side construction only: email from the session cookie, names
 * from the invite row. Never passed through a client payload.
 */
export interface RsvpIdentity {
  email: string;
  firstName: string;
  lastName: string;
}

/** Shape of the body POSTed to /api/rsvp/[slug]/resend-link. */
export const ResendLinkInput = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

export type ResendLinkInput = z.infer<typeof ResendLinkInput>;
