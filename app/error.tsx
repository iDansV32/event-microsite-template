"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[app error]", error);
    }
  }, [error]);

  return (
    <main
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        padding: "64px 24px",
        background: "var(--bg)",
      }}
    >
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <div className="eyebrow" style={{ color: "var(--terracotta)" }}>
          Something went wrong
        </div>
        <h1 className="display" style={{ fontSize: 48, marginTop: 12 }}>
          We hit a snag.
        </h1>
        <p
          className="serif"
          style={{
            marginTop: 16,
            color: "var(--ink-70)",
            fontStyle: "italic",
            lineHeight: 1.5,
          }}
        >
          Try again. If it keeps happening, reach out to your event organizer.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="btn btn-primary"
          style={{ marginTop: 32 }}
        >
          Try again
        </button>
      </div>
    </main>
  );
}
