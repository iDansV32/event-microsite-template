"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ImgPh, type ImgPhVariant } from "@/components/ImgPh";
import type { Day } from "@/lib/schemas";
import { formatDayNumber } from "@/lib/format";

// Per-day accent + ImgPh variant rotations. Authors can override accent per
// day via Day.accent; the variant isn't data — it's just the gradient used
// behind the image while it loads.
const ACCENTS = ["var(--terracotta)", "var(--olive)", "var(--teal)", "var(--terracotta)"];
const VARIANTS: ImgPhVariant[] = ["sunset", "palms", "pool", "sand"];

export function AgendaView({
  days,
  title,
  lede,
  notice,
  eyebrow,
  cityShort,
}: {
  days: Day[];
  title?: { main: string; emphasis?: string };
  lede?: string;
  notice?: string;
  eyebrow: string;
  cityShort: string;
}) {
  const [active, setActive] = useState(0);

  const resolvedTitle = title ?? {
    main: `${dayCountLabel(days.length)} in`,
    emphasis: `${cityShort}.`,
  };
  const resolvedLede =
    lede ?? "The program unfolds gently — long mornings, generous afternoons, and evenings together.";

  return (
    <div className="page-in">
      <PageHeader
        eyebrow={eyebrow}
        title={
          <>
            {resolvedTitle.main}
            {resolvedTitle.emphasis && (
              <>
                <br />
                <em style={{ fontStyle: "italic" }}>{resolvedTitle.emphasis}</em>
              </>
            )}
          </>
        }
        lede={resolvedLede}
      />

      <div className="container-ed">
        {notice && (
          <div
            role="note"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              padding: "18px 22px",
              background: "color-mix(in srgb, var(--warn) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--warn) 30%, transparent)",
              borderRadius: 12,
              marginBottom: 48,
            }}
          >
            <span
              aria-hidden
              className="serif"
              style={{
                fontSize: 22,
                color: "var(--warn)",
                lineHeight: 1,
                fontStyle: "italic",
              }}
            >
              ✦
            </span>
            <div style={{ fontSize: 14, lineHeight: 1.55 }}>{notice}</div>
          </div>
        )}

        <div
          role="tablist"
          aria-label="Agenda day"
          className="ed-flex agenda-day-tabs"
          style={{ marginBottom: 48, flexWrap: "wrap", gap: 12 }}
        >
          {days.map((d, i) => {
            const accent = d.accent ?? ACCENTS[i % ACCENTS.length];
            const on = active === i;
            return (
              <button
                key={d.date}
                role="tab"
                id={`agenda-tab-${i}`}
                aria-selected={on}
                aria-controls={`agenda-panel-${i}`}
                onClick={() => setActive(i)}
                style={{
                  padding: "14px 24px",
                  borderRadius: 12,
                  border: `1px solid ${on ? accent : "var(--ink-12)"}`,
                  background: on ? accent : "var(--paper)",
                  color: on ? "var(--bg)" : "var(--ink)",
                  textAlign: "left",
                  minWidth: 180,
                  transition: "all 0.2s",
                  cursor: "pointer",
                }}
              >
                <div
                  className="eyebrow"
                  style={{
                    color: on ? "rgba(245,240,232,0.75)" : "var(--ink-55)",
                    fontSize: 10,
                    marginBottom: 6,
                  }}
                >
                  Day {i + 1} · {d.weekday}
                </div>
                <div
                  className="serif"
                  style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.01em" }}
                >
                  {formatMonthDayShort(d.date)}
                </div>
              </button>
            );
          })}
        </div>

        {/* All day panels mount so the aria-controls references on the tab
            buttons always resolve to real nodes. `hidden` hides inactive
            panels from both the visual and accessibility trees. */}
        {days.map((d, i) => {
          const accent = d.accent ?? ACCENTS[i % ACCENTS.length];
          const variant = VARIANTS[i % VARIANTS.length];
          return (
            <div
              key={d.date}
              role="tabpanel"
              id={`agenda-panel-${i}`}
              aria-labelledby={`agenda-tab-${i}`}
              hidden={active !== i}
              className={active === i ? "page-in" : undefined}
            >
              <div
                className="ed-grid stack-mobile agenda-day-grid"
                style={{
                  gridTemplateColumns: "1fr 2fr",
                  gap: 64,
                  alignItems: "start",
                }}
              >
                <div className="agenda-day-intro" style={{ position: "sticky", top: 100 }}>
                  <div
                    className="eyebrow"
                    style={{ color: accent, marginBottom: 12 }}
                  >
                    {d.weekday.toUpperCase()} · DAY {i + 1}
                  </div>
                  <h2
                    className="display"
                    style={{
                      fontSize: 88,
                      lineHeight: 0.92,
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {formatDayNumber(d.date)}
                    <span style={{ color: accent, fontStyle: "italic" }}>.</span>
                  </h2>
                  {d.mood && (
                    <div
                      className="serif"
                      style={{
                        fontSize: 22,
                        fontStyle: "italic",
                        color: "var(--ink-70)",
                        marginTop: 12,
                      }}
                    >
                      {d.mood}
                    </div>
                  )}
                  {d.image && (
                    <div style={{ marginTop: 32 }}>
                      <ImgPh
                        variant={variant}
                        src={d.image.src}
                        alt={d.image.alt}
                        label={d.image.label}
                        ratio="4/5"
                      />
                    </div>
                  )}
                </div>

                <div>
                  {d.sessions.map((s, j) => (
                    <div
                      key={j}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "80px 1fr",
                        gap: 40,
                        padding: "28px 0",
                        borderBottom:
                          j === d.sessions.length - 1 ? "none" : "1px solid var(--ink-12)",
                        opacity: s.tbd ? 0.72 : 1,
                      }}
                    >
                      <div>
                        <div
                          className="mono"
                          style={{
                            fontSize: 13,
                            color: accent,
                            letterSpacing: "0.04em",
                          }}
                        >
                          {s.time}
                        </div>
                      </div>
                      <div>
                        <div
                          className="ed-flex items-center"
                          style={{ flexWrap: "wrap", gap: 12 }}
                        >
                          <h3
                            className="serif"
                            style={{
                              fontSize: s.featured ? 30 : 24,
                              fontWeight: 400,
                              letterSpacing: "-0.01em",
                              margin: 0,
                              fontStyle: s.featured ? "italic" : "normal",
                            }}
                          >
                            {s.title}
                          </h3>
                          {s.featured && <span className="tag tag-accent">Keynote</span>}
                          {s.tbd && <span className="tag">TBD</span>}
                        </div>
                        {s.detail && (
                          <p
                            style={{
                              fontSize: 15,
                              lineHeight: 1.6,
                              color: "var(--ink-70)",
                              marginTop: 8,
                              marginBottom: 0,
                            }}
                          >
                            {s.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "Jun 1" — used on the day tabs. */
function formatMonthDayShort(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${MONTHS_SHORT[Number(m[2]) - 1]} ${Number(m[3])}`;
}

function dayCountLabel(n: number): string {
  const words = [
    "Zero",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
  ];
  const word = words[n] ?? String(n);
  return `${word} days`;
}
