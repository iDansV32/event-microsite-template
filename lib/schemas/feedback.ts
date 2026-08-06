import { z } from "zod";

/**
 * Post-event feedback section backed by an embedded Tally form.
 *
 * The page at /e/<slug>/feedback renders a plain <iframe> pointing at
 * https://tally.so/embed/<tallyFormId> with an explicit allowlist of
 * query params (theming flags + hidden fields). Submissions come back
 * through /api/webhooks/tally, which resolves the event by matching
 * the payload's formId against this field — so a wrong/placeholder
 * tallyFormId means responses are signed-valid but rejected as
 * unknown_form. Only ever commit the real ID with the section enabled.
 */
export const Feedback = z.object({
  /** Tally form ID from the share URL (tally.so/r/<id>). */
  tallyFormId: z.string().regex(/^[A-Za-z0-9]+$/, "Tally form id"),
  /** Gates the page only. The webhook stores late submissions regardless,
      since they already happened on Tally's side. */
  isOpen: z.boolean(),
  heading: z.string().min(1).optional(),
  intro: z.string().min(1).optional(),
  /** Shown when isOpen is false ("feedback window has closed" copy). */
  outro: z.string().min(1).optional(),
  /** Fixed embed height. No Tally embed.js auto-resize by design —
      long forms scroll inside the frame; tune per event. */
  iframeHeightPx: z.number().int().min(300).max(4000).default(900),
});

export type Feedback = z.infer<typeof Feedback>;

/**
 * Body for POST /api/internal/[slug]/feedback-emails. Absent mode is
 * dry-run; an unrecognized mode fails validation (400) rather than
 * silently sending — "live" is the only string that triggers sends,
 * and only together with confirm === slug.
 */
export const FeedbackEmailRequest = z.object({
  mode: z.enum(["dry-run", "live"]).default("dry-run"),
  confirm: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export type FeedbackEmailRequest = z.infer<typeof FeedbackEmailRequest>;
