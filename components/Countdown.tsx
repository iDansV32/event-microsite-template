"use client";

import { useEffect, useState } from "react";

export function Countdown({
  targetISO,
  compact = false,
}: {
  targetISO: string;
  compact?: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(targetISO).getTime();
  const ms = Math.max(0, target - now);
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);

  const cell = (n: number, label: string) => (
    <div style={{ textAlign: "center" }}>
      <div
        className="display"
        style={{ fontSize: compact ? 48 : 72, fontWeight: 300, lineHeight: 0.9 }}
      >
        {String(n).padStart(2, "0")}
      </div>
      <div className="eyebrow" style={{ marginTop: 8, fontSize: 10 }}>
        {label}
      </div>
    </div>
  );

  const sep = (
    <div
      style={{
        fontSize: compact ? 40 : 60,
        color: "var(--ink-40)",
        fontFamily: "var(--f-serif)",
        fontWeight: 200,
        lineHeight: 0.9,
      }}
    >
      ·
    </div>
  );

  return (
    <div className="ed-flex" style={{ gap: compact ? 24 : 40, alignItems: "flex-start" }}>
      {cell(days, "Days")}
      {sep}
      {cell(hours, "Hours")}
      {sep}
      {cell(mins, "Minutes")}
    </div>
  );
}
