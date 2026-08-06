import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  lede,
  align = "left",
  tall = false,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  align?: "left" | "center";
  tall?: boolean;
}) {
  return (
    <div
      className="container-ed"
      style={{
        paddingTop: tall ? 96 : 64,
        paddingBottom: 48,
        textAlign: align,
      }}
    >
      {eyebrow && (
        <div className="eyebrow eyebrow-accent" style={{ marginBottom: 20 }}>
          {eyebrow}
        </div>
      )}
      <h1
        className="display"
        style={{
          fontSize: "var(--t-4xl)",
          maxWidth: 960,
          margin: align === "center" ? "0 auto" : 0,
        }}
      >
        {title}
      </h1>
      {lede && (
        <p
          className="serif"
          style={{
            fontSize: 20,
            lineHeight: 1.5,
            color: "var(--ink-70)",
            marginTop: 24,
            maxWidth: 640,
            fontStyle: "italic",
            marginLeft: align === "center" ? "auto" : 0,
            marginRight: align === "center" ? "auto" : 0,
          }}
        >
          {lede}
        </p>
      )}
    </div>
  );
}
