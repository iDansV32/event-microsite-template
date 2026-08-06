import "server-only";

import { createHmac } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Pseudonymous respondent token for the embedded Tally feedback form.
 *
 * Stable per (slug, email): the feedback page passes it to Tally as a
 * hidden field, and the webhook stores whatever comes back. No raw PII
 * leaves our origin — organizers can resolve a token to an attendee
 * later by recomputing it over invited_attendees, but Tally (and anyone
 * reading its dashboard) only ever sees an opaque hex string.
 *
 * The token travels through the iframe URL, so a respondent can read
 * and tamper with their own. Treat it as a completion/attribution hint,
 * never as authentication — the page it's embedded in is what's
 * auth-gated.
 *
 * Keyed by FEEDBACK_RESPONDENT_SECRET (dedicated; see lib/env.ts), so
 * rotating AUTH_TOKEN_SECRET never breaks historical token linkage.
 */
export function respondentToken(slug: string, email: string): string {
  return createHmac("sha256", env.feedback.respondentSecret())
    .update(`feedback-respondent:${slug}:${email.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);
}
