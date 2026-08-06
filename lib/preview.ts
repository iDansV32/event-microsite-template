/**
 * Draft-preview mode.
 *
 * When enabled, unauthenticated GET browsing of `/e/<slug>/*` pages is
 * allowed IFF the event's `meta.status === "draft"`. Published events
 * still require auth. Mutation routes (POST /api/rsvp/*, /api/auth/*,
 * /api/cron/*), the organizer surface (/internal/*, /api/internal/*),
 * and the registration form (writes to the DB on submit) are all
 * UNAFFECTED — they continue to require real sessions.
 *
 * The purpose is to let a CSL preview a draft microsite's public
 * content (overview / agenda / hotel / faq / expensing) without first
 * standing up Supabase + Resend + Upstash + seeding a real invite.
 * That's the friction wall the first CSL pilot ran into; preview mode
 * is the M4-B fix.
 *
 * Activation contract (allowlist-style, fail-closed):
 *
 *   - `DRAFT_PREVIEW=1` env var is set (any other value = off)
 *   - AND we are NOT on Vercel Production (VERCEL_ENV !== "production")
 *
 * Intended for local dev and Vercel Preview deploys. Never activates
 * on Production, even if someone accidentally sets the env var there.
 *
 * Runtime-agnostic: no Node-only APIs, safe to import from middleware
 * (edge), server components (node), and route handlers (node).
 */

export function isDraftPreviewEnabled(): boolean {
  if (process.env.DRAFT_PREVIEW !== "1") return false;
  if (process.env.VERCEL_ENV === "production") return false;
  return true;
}

/**
 * Whether the auth gate should be bypassed for THIS event right now.
 *
 * Composes the deployment-level capability check (above) with the event's
 * own `previewMode`. Intentionally takes only the two meta fields it
 * needs so callers don't have to load a full bundle just to ask.
 *
 * Truth table:
 *   status        previewMode  isDraftPreviewEnabled  →  bypass?
 *   "published"   any          any                    →  false
 *   "archived"    any          any                    →  false
 *   "draft"       "content"    false                  →  false
 *   "draft"       "content"    true                   →  TRUE
 *   "draft"       "auth"       any                    →  false
 *
 * Banner visibility ("you're looking at a draft, content not final") is a
 * separate predicate — see app/e/[slug]/layout.tsx. A `previewMode: "auth"`
 * event still wants the banner shown after login, but never wants the
 * auth call skipped.
 */
export function shouldBypassDraftAuth(meta: {
  status: "draft" | "published" | "archived";
  previewMode: "content" | "auth";
}): boolean {
  if (!isDraftPreviewEnabled()) return false;
  if (meta.status !== "draft") return false;
  if (meta.previewMode === "auth") return false;
  return true;
}
