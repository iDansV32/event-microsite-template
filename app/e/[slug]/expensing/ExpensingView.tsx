import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import type {
  ExpenseItem,
  HowToSubmitCallout,
  HowToSubmitStep,
} from "@/lib/schemas";

export function ExpensingView({
  brand,
  slackChannel,
  covered,
  notCovered,
  submissionDeadline,
  travelToolUrl,
  howToSubmit,
}: {
  brand: string;
  slackChannel?: string;
  covered: ExpenseItem[];
  notCovered: ExpenseItem[];
  submissionDeadline?: { date: string; body: string };
  travelToolUrl?: string;
  howToSubmit?: {
    steps: HowToSubmitStep[];
    callouts?: HowToSubmitCallout[];
  };
}) {
  const aside =
    submissionDeadline || travelToolUrl ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {submissionDeadline && <DeadlineCard {...submissionDeadline} />}
        {travelToolUrl && (
          <a
            href={travelToolUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-block"
          >
            Open travel tool
            <Icon name="external" size={16} />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
      </div>
    ) : undefined;

  return (
    <div className="page-in page-end">
      <PageHeader
        eyebrow="Expensing"
        title="What’s covered"
        lede={
          <>
            Based on the {brand} travel policy.
            {slackChannel && <> When in doubt, post in {slackChannel} before you book.</>}
          </>
        }
        aside={aside}
      />

      <div className="container section-sm">
        <div className="cards cards-2" style={{ gap: 32 }}>
          <PolicyColumn title="Covered" tone="good" items={covered} />
          <PolicyColumn title="Not covered" tone="bad" items={notCovered} />
        </div>
      </div>

      {howToSubmit && (
        <>
          <section className="container section-md" aria-labelledby="how-to-submit">
            <div className="kicker">Reimbursement</div>
            <h2 id="how-to-submit" className="h2" style={{ marginTop: 8, marginBottom: 32 }}>
              How to submit
            </h2>
            <ol
              role="list"
              className="cards cards-3"
              style={{ listStyle: "none", margin: 0, padding: 0 }}
            >
              {howToSubmit.steps.map((step, i) => (
                <li key={i} className="card">
                  <div
                    className="tabular"
                    style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="h3" style={{ marginTop: 28 }}>
                    {step.title}
                  </h3>
                  <p className="body" style={{ marginTop: 8 }}>
                    {step.detail}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {howToSubmit.callouts && howToSubmit.callouts.length > 0 && (
            <div className="container" style={{ paddingTop: 16 }}>
              <div className="cards cards-2">
                {howToSubmit.callouts.map((c, i) => (
                  <Callout key={i} {...c} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DeadlineCard({ date, body }: { date: string; body: string }) {
  const parsed = parseMonthDay(date);
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        alignItems: "center",
        padding: "20px 24px",
        borderRadius: 16,
        background: "var(--accent-soft)",
      }}
    >
      <div
        aria-hidden
        style={{
          flex: "0 0 auto",
          width: 64,
          height: 64,
          borderRadius: 14,
          background: "var(--bg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: parsed ? undefined : "var(--accent)",
        }}
      >
        {parsed ? (
          <>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--accent)",
                letterSpacing: "0.04em",
              }}
            >
              {parsed.monthShort.toUpperCase()}
            </span>
            <span
              className="tabular"
              style={{
                fontSize: 24,
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}
            >
              {parsed.day}
            </span>
          </>
        ) : (
          <Icon name="calendar" size={24} />
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>
          Submission deadline
          {parsed ? (
            <span className="sr-only">: {`${parsed.monthLong} ${parsed.day}`}</span>
          ) : (
            <> · {date}</>
          )}
        </div>
        <p style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.5, color: "var(--ink-muted)" }}>
          {body}
        </p>
      </div>
    </div>
  );
}

function PolicyColumn({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "good" | "bad";
  items: ExpenseItem[];
}) {
  const good = tone === "good";
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          paddingBottom: 16,
          borderBottom: "1px solid var(--ink)",
        }}
      >
        <span
          className={good ? "badge-solid" : undefined}
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            ...(good ? {} : { background: "var(--line)", color: "var(--ink)" }),
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={good ? "check" : "x"} size={16} strokeWidth={2.25} />
        </span>
        <h2 className="h3" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>
          {title}
        </h2>
      </div>
      <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {items.map((x, i) => (
          <li
            key={x.title}
            style={{
              padding: "18px 0",
              borderBottom: i === items.length - 1 ? undefined : "1px solid var(--line)",
            }}
          >
            <h3 className="h4">{x.title}</h3>
            <p className="body" style={{ marginTop: 6 }}>
              {x.detail}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Callout({ title, body, tone = "warn" }: HowToSubmitCallout) {
  const warn = tone === "warn";
  const color = warn ? "var(--warn)" : "var(--accent)";
  return (
    <div
      className={`callout ${warn ? "callout-warn" : "callout-accent"}`}
      style={{ padding: 24 }}
    >
      <Icon name={warn ? "alert" : "info"} size={20} strokeWidth={1.9} style={{ color, marginTop: 1 }} />
      <div style={{ minWidth: 0 }}>
        <h3 className="h4" style={{ color }}>
          {title}
        </h3>
        <p className="body" style={{ marginTop: 6 }}>
          {body}
        </p>
      </div>
    </div>
  );
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Pull a month + day out of the authored deadline string for the date tile.
 * Accepts "08/14" (MM/DD, the documented format), "14/08" when the first
 * number can't be a month, an optional trailing year, ISO "2026-08-14",
 * and "Aug 14" / "14 August". Returns null for anything else so the card
 * can fall back to showing the string as written.
 */
function parseMonthDay(
  raw: string,
): { monthShort: string; monthLong: string; day: number } | null {
  const s = raw.trim();
  let month: number | undefined;
  let day: number | undefined;

  const iso = /^\d{4}-(\d{1,2})-(\d{1,2})/.exec(s);
  const numeric = /^(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](?:\d{2}|\d{4}))?$/.exec(s);
  const monthFirst = /^([A-Za-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/.exec(s);
  const dayFirst = /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,})\b/.exec(s);

  if (iso) {
    month = Number(iso[1]);
    day = Number(iso[2]);
  } else if (numeric) {
    const a = Number(numeric[1]);
    const b = Number(numeric[2]);
    if (a <= 12) {
      month = a;
      day = b;
    } else if (b <= 12) {
      month = b;
      day = a;
    }
  } else if (monthFirst) {
    month = monthIndex(monthFirst[1]);
    day = Number(monthFirst[2]);
  } else if (dayFirst) {
    month = monthIndex(dayFirst[2]);
    day = Number(dayFirst[1]);
  }

  if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const monthLong = MONTHS[month - 1];
  return { monthLong, monthShort: monthLong.slice(0, 3), day };
}

function monthIndex(name: string): number | undefined {
  const key = name.slice(0, 3).toLowerCase();
  const i = MONTHS.findIndex((m) => m.slice(0, 3).toLowerCase() === key);
  return i === -1 ? undefined : i + 1;
}
