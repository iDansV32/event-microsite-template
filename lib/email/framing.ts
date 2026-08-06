import "server-only";

/**
 * Email environment framing — single source of truth for whether an
 * outgoing email should be marked `[TEST]` (staging/preview) or sent
 * untouched (production).
 *
 * Applied by both transactional email templates:
 *   - lib/auth/invite-email.ts → magic-link sign-in emails
 *   - lib/resend.ts            → RSVP confirmation + resend-link emails
 *
 * Adding a new email type? Apply this helper too. The point of a
 * single helper is that the staging/production signal is consistent
 * across every email the app sends — recipients should never have to
 * guess which environment an email came from.
 *
 * ─── Driver: explicit env var, NOT VERCEL_ENV ───────────────────
 *
 * Reads `EMAIL_ENVIRONMENT` rather than `VERCEL_ENV` for three reasons:
 *
 *   1. VERCEL_ENV has three values (production / preview / development)
 *      that don't cleanly collapse to two-state framing logic. Does
 *      `development` (local dev) count as "production" (no prefix) or
 *      "staging" (prefix)? Either choice has a wrong case. Explicit
 *      avoids the question.
 *
 *   2. VERCEL_ENV only exists on Vercel deployments. If this code ever
 *      runs in a non-Vercel context (CI, scripts, future migration
 *      tools), VERCEL_ENV is empty and the framing decision defaults
 *      somewhere uncontrolled. EMAIL_ENVIRONMENT is portable.
 *
 *   3. EMAIL_ENVIRONMENT is part of the .vercel-env-policy.json
 *      `scopeSpecific` bucket — Production scope sets `production`,
 *      Preview scope sets `staging`. The audit script (when it lands)
 *      asserts these differ. Self-documenting policy.
 *
 * ─── Fail-safe behavior ─────────────────────────────────────────
 *
 *   EMAIL_ENVIRONMENT="production"  → no framing
 *   EMAIL_ENVIRONMENT="staging"     → [TEST] prefix + body banner
 *   EMAIL_ENVIRONMENT=<unknown>     → [TEST] prefix + body banner
 *                                      (over-flagging beats under-flagging)
 *   EMAIL_ENVIRONMENT=<unset>       → no framing (defaults production)
 *
 * The "unknown gets framed" rule is deliberate. If someone typos
 * EMAIL_ENVIRONMENT=stagging on Preview scope, the frame still applies
 * — better an over-flagged email than a real-looking email accidentally
 * sent from a misconfigured staging stack.
 *
 * The "unset defaults to production" rule is also deliberate. Forgetting
 * the variable on a production deploy shouldn't break production emails;
 * production-shaped output is the safer default for missing config.
 *
 * The two rules together: explicit `production` is the only way to NOT
 * frame; everything else frames.
 */

const STAGING_SUBJECT_PREFIX = "[TEST] ";

const STAGING_BODY_BANNER =
  "This is a staging/test email from a preview microsite. " +
  "Do not forward to attendees unless instructed.\n\n";

const STAGING_BODY_BANNER_HTML =
  '<div style="background: #FFF3CD; border-left: 4px solid #856404; ' +
  'padding: 12px 16px; margin: 0 0 24px; font-size: 13px; ' +
  'color: #856404; line-height: 1.5; border-radius: 6px;">' +
  "<strong>[TEST]</strong> This is a staging/test email from a preview " +
  "microsite. Do not forward to attendees unless instructed." +
  "</div>";

export interface EmailEnvFraming {
  /** Subject prefix to prepend (e.g. "[TEST] " or ""). */
  subjectPrefix: string;
  /** Plain-text body banner to prepend. Empty string in production. */
  bodyBanner: string;
  /** HTML body banner block to inject at the top of the email body. Empty string in production. */
  bodyBannerHtml: string;
}

/**
 * Read `EMAIL_ENVIRONMENT` and return the appropriate framing strings.
 *
 * Call once per email send — output is intentionally not cached so that
 * env changes during a long-running process (rare, but possible in
 * dev) take effect immediately on the next email.
 */
export function emailEnvFraming(): EmailEnvFraming {
  const env = (process.env.EMAIL_ENVIRONMENT ?? "production")
    .trim()
    .toLowerCase();

  if (env === "production") {
    return {
      subjectPrefix: "",
      bodyBanner: "",
      bodyBannerHtml: "",
    };
  }

  // "staging" OR any unknown value → frame it. Better to over-flag.
  return {
    subjectPrefix: STAGING_SUBJECT_PREFIX,
    bodyBanner: STAGING_BODY_BANNER,
    bodyBannerHtml: STAGING_BODY_BANNER_HTML,
  };
}
