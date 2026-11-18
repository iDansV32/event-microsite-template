import type { ReactNode } from "react";

/**
 * Standard page intro: accent kicker, large sans title, muted lede.
 * Renders its own container, so place it at the top level of a page.
 */
export function PageHeader({
  eyebrow,
  title,
  lede,
  align = "left",
  aside,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  align?: "left" | "center";
  /** Optional block shown to the right of the title (stacks on phones). */
  aside?: ReactNode;
  /** @deprecated kept for older callers; has no effect. */
  tall?: boolean;
}) {
  const centered = align === "center";
  const intro = (
    <div
      style={{
        flex: "999 1 520px",
        minWidth: 0,
        textAlign: align,
      }}
    >
      {eyebrow && <div className="kicker">{eyebrow}</div>}
      <h1
        className="h1"
        style={{ marginTop: eyebrow ? 10 : 0, marginInline: centered ? "auto" : 0, maxWidth: 880 }}
      >
        {title}
      </h1>
      {lede && (
        <p className="lede" style={{ marginTop: 18, marginInline: centered ? "auto" : 0 }}>
          {lede}
        </p>
      )}
    </div>
  );

  return (
    <div className="container page-head">
      {aside ? (
        <div className="split split-end" style={{ gap: "32px 48px" }}>
          {intro}
          <div style={{ flex: "1 1 300px", minWidth: 0 }}>{aside}</div>
        </div>
      ) : (
        intro
      )}
    </div>
  );
}
