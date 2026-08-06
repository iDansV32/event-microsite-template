/**
 * Normalise a `next` redirect target so an attacker can't hand-craft an
 * open-redirect onto another origin. Edge-safe (no URL parsing that
 * reaches out for globals beyond URL).
 *
 * Accepted: in-site absolute paths that belong to the caller's event —
 * either `/e/<slug>` / `/e/<slug>/...` (attendee surface) or
 * `/internal/<slug>` / `/internal/<slug>/...` (organizer surface).
 * Rejected: anything escaping those two trees, protocol-relative URLs
 * (`//evil`), absolute URLs, and empty / whitespace strings.
 *
 * Callers pass the expected slug so we can confirm the target belongs to
 * the same event. Anything unsafe collapses to the event root
 * (`/e/<slug>`), which is the only path guaranteed to resolve for every
 * event: it redirects to the first enabled section via
 * app/e/[slug]/page.tsx. Hardcoding `/overview` here would 404 for any
 * event that disables that section.
 */

export function safeNextPath(slug: string, raw: string | null | undefined): string {
  const fallback = `/e/${slug}`;
  if (!raw || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return fallback;

  // Protocol-relative or absolute URL — reject.
  if (trimmed.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return fallback;
  }

  // Must start with `/` — nothing relative.
  if (!trimmed.startsWith("/")) return fallback;

  // Must stay inside this event's attendee or organizer subtree.
  const eventBase = `/e/${slug}`;
  const internalBase = `/internal/${slug}`;
  const inEventTree =
    trimmed === eventBase || trimmed.startsWith(`${eventBase}/`);
  const inInternalTree =
    trimmed === internalBase || trimmed.startsWith(`${internalBase}/`);
  if (!inEventTree && !inInternalTree) return fallback;

  // No traversal / control chars.
  if (trimmed.includes("\\") || /[\x00-\x1f]/.test(trimmed)) return fallback;
  if (trimmed.includes("/../") || trimmed.endsWith("/..")) return fallback;

  return trimmed;
}
