/**
 * Banner shown on every page when an event is rendered in draft-preview
 * mode. Two variants of the message depending on whether the auth gate
 * has actually been bypassed:
 *
 *   authBypassed = true  → previewMode "content": unauthenticated browsing
 *     of `/e/<slug>/*` is allowed. Anyone with the URL is in. Banner
 *     warns explicitly so a CSL can't accidentally treat a shared
 *     preview URL as the live site.
 *
 *   authBypassed = false → previewMode "auth": viewer logged in via the
 *     normal magic-link flow. Auth wasn't bypassed; the banner just
 *     marks that this is a draft event whose copy is not final.
 *
 * Rendered by the attendee layout when the preview env is on AND the
 * event is `status: "draft"`. Server component, no interactivity.
 */
export function PreviewBanner({ authBypassed }: { authBypassed: boolean }) {
  const message = authBypassed
    ? "Draft preview — auth is bypassed because this draft is in content-preview mode. Do not share this URL as if it were the real site."
    : "Draft preview — content here is not final.";

  return (
    <div
      role="status"
      style={{
        background: "var(--warn, #D97706)",
        color: "#FFFFFF",
        padding: "8px 16px",
        fontSize: 13,
        fontWeight: 500,
        textAlign: "center",
        letterSpacing: "0.02em",
      }}
    >
      {message}
    </div>
  );
}
