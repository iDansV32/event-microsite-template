import { z } from "zod";

export const SECTION_KEYS = [
  "overview",
  "agenda",
  "hotel",
  "registration",
  "faq",
  "expensing",
  "feedback",
  "recap",
] as const;

export const SectionKey = z.enum(SECTION_KEYS);
export type SectionKey = z.infer<typeof SectionKey>;

export const EventStatus = z.enum(["draft", "published", "archived"]);
export type EventStatus = z.infer<typeof EventStatus>;

/**
 * Per-event preview mode. Only consulted when `status === "draft"` and
 * the deployment has draft-preview capability turned on (see lib/preview.ts).
 *
 *   "content" (default) — public draft preview. Unauthenticated visitors
 *     can browse `/e/<slug>/*` to review copy. The registration form is
 *     still hidden behind a "wire up auth to test this" notice. Intended
 *     for client-review previews where the CSL shares a URL.
 *
 *   "auth" — auth-gated draft preview. The same draft-status banner
 *     renders for context, but `/e/<slug>/*` enforces real auth — visitor
 *     must be in `invited_attendees`. Intended for smoke-test paths
 *     and pre-publish auth dry-runs.
 *
 * Published events ignore this field; they are always auth-gated.
 * Archived events ignore this field; they remain auth-gated as today.
 */
export const PreviewMode = z.enum(["content", "auth"]);
export type PreviewMode = z.infer<typeof PreviewMode>;

export const RetentionPolicy = z.object({
  pii: z.enum(["30d", "90d", "until-event+30d"]).default("90d"),
  public: z.enum(["forever", "90d"]).default("forever"),
});

export const Meta = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be kebab-case"),
  templateVersion: z.string().regex(/^\d+\.\d+\.\d+$/, "semver required"),
  status: EventStatus,
  previewMode: PreviewMode.default("content"),
  enabledSections: z.array(SectionKey).min(1),
  publishedAt: z.string().datetime().optional(),
  archivedAt: z.string().datetime().optional(),
  retention: RetentionPolicy,
  rsvp: z.object({
    supabaseTable: z.string().default("rsvps"),
  }),
});

export type Meta = z.infer<typeof Meta>;
