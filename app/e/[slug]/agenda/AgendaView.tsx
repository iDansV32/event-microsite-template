import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import type { Day, Session } from "@/lib/schemas";
import { formatMonthDay } from "@/lib/format";

export function AgendaView({
  days,
  title,
  lede,
  notice,
  cityShort,
}: {
  days: Day[];
  title?: { main: string; emphasis?: string };
  lede?: string;
  notice?: string;
  cityShort: string;
}) {
  const resolvedTitle = title
    ? [title.main, title.emphasis].filter(Boolean).join(" ")
    : `${dayCountLabel(days.length)} in ${cityShort}`;
  const resolvedLede =
    lede ?? "The program unfolds gently — long mornings, generous afternoons, and evenings together.";

  return (
    <div className="page-in">
      <PageHeader eyebrow="Agenda" title={resolvedTitle} lede={resolvedLede} />

      {(notice || days.length > 1) && (
        <div className="container">
          {notice && (
            <div
              role="note"
              className="callout callout-note"
              style={{ marginTop: 32, fontSize: 14, color: "var(--ink-muted)" }}
            >
              <Icon name="info" size={18} style={{ marginTop: 1 }} />
              <span>{notice}</span>
            </div>
          )}

          {days.length > 1 && (
            <nav
              aria-label="Days"
              style={{ marginTop: 32, display: "flex", flexWrap: "wrap", gap: 8 }}
            >
              {days.map((d, i) => (
                <a key={d.date} href={`#day-${i + 1}`} className="chip" style={{ gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{d.weekday.slice(0, 3)}</span>
                  <span className="text-muted" style={{ fontWeight: 400 }}>
                    {formatMonthDayShort(d.date)}
                  </span>
                </a>
              ))}
            </nav>
          )}
        </div>
      )}

      <div className="container page-end" style={{ paddingTop: 48 }}>
        <div className="rows">
          {days.map((d, i) => (
            <div
              key={d.date}
              id={`day-${i + 1}`}
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "16px 48px",
                padding: "40px 0",
                scrollMarginTop: 80,
              }}
            >
              <div
                style={{
                  flex: "1 1 220px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: d.accent ?? "var(--accent)",
                  }}
                >
                  Day {i + 1}
                </div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 26,
                    lineHeight: 1.2,
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {d.weekday}, {formatMonthDay(d.date)}
                </h2>
                {d.mood && (
                  <div className="text-muted" style={{ fontSize: 15 }}>
                    {d.mood}
                  </div>
                )}
              </div>

              <ol
                role="list"
                style={{
                  flex: "999 1 560px",
                  minWidth: 0,
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                }}
              >
                {d.sessions.map((s, j) => (
                  <SessionRow
                    key={`${s.time}-${j}`}
                    session={s}
                    last={j === d.sessions.length - 1}
                  />
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SessionRow({ session: s, last }: { session: Session; last: boolean }) {
  const featured = !!s.featured;
  return (
    <li
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "4px 24px",
        ...(featured
          ? {
              padding: 16,
              margin: "4px -16px",
              borderRadius: 12,
              background: "var(--accent-soft)",
            }
          : {
              padding: "16px 0",
              borderBottom: last ? undefined : "1px solid var(--line)",
            }),
      }}
    >
      <div
        className="tabular"
        style={{
          flex: "0 0 88px",
          fontSize: 15,
          fontWeight: 600,
          color: featured ? "var(--accent)" : undefined,
        }}
      >
        {formatTime12h(s.time)}
      </div>
      <div style={{ flex: "1 1 260px", minWidth: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <h3 className="h3" style={{ fontSize: 17 }}>
            {s.title}
          </h3>
          {featured && <span className="badge badge-solid">Featured</span>}
          {s.tbd && <span className="badge">Details TBD</span>}
        </div>
        {s.detail && (
          <p className="body" style={{ marginTop: 4 }}>
            {s.detail}
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * "18:00" → "6:00 PM". Session times are stored as 24-hour "HH:MM"
 * strings; ranges ("09:00–10:30") are formatted piecewise. Anything that
 * doesn't parse is shown exactly as authored.
 */
function formatTime12h(time: string): string {
  const parts = time.split(/\s*[–—-]\s*/);
  const formatted = parts.map((part) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(part.trim());
    if (!m) return null;
    const h = Number(m[1]);
    if (h > 24 || Number(m[2]) > 59) return null;
    const period = h >= 12 && h < 24 ? "PM" : "AM";
    return `${h % 12 || 12}:${m[2]} ${period}`;
  });
  if (formatted.some((f) => f === null)) return time;
  return formatted.join("–");
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

/** "Jun 1" — used on the day jump links. */
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
  return `${word} ${n === 1 ? "day" : "days"}`;
}
