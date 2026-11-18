"use client";

import { useEffect, useState } from "react";

/**
 * Days / hours / minutes / seconds until `targetISO`, as four tiles.
 * Renders dashes until mounted so server and client markup match.
 */
export function Countdown({
  targetISO,
  compact = false,
}: {
  targetISO: string;
  compact?: boolean;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(targetISO).getTime();
  const ms = now === null ? null : Math.max(0, target - now);
  const parts: [number | null, string][] = [
    [ms === null ? null : Math.floor(ms / 86_400_000), "days"],
    [ms === null ? null : Math.floor((ms % 86_400_000) / 3_600_000), "hours"],
    [ms === null ? null : Math.floor((ms % 3_600_000) / 60_000), "min"],
    [ms === null ? null : Math.floor((ms % 60_000) / 1_000), "sec"],
  ];

  return (
    <div
      role="timer"
      aria-label="Time until the event starts"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 8,
      }}
    >
      {parts.map(([n, label]) => (
        <div
          key={label}
          style={{
            background: "var(--bg)",
            borderRadius: 12,
            padding: compact ? "10px 4px" : "14px 6px",
            textAlign: "center",
          }}
        >
          <div
            className="tabular"
            style={{
              fontSize: compact ? 24 : 30,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
            }}
          >
            {n === null ? "--" : String(n).padStart(2, "0")}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
