"use client";

import { useState } from "react";
import type {
  ExpenseItem,
  HowToSubmitCallout,
  HowToSubmitStep,
} from "@/lib/schemas";

type Tab = "covered" | "not" | "how";

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
  const hasHowTo = !!howToSubmit;
  const [tab, setTab] = useState<Tab>("covered");
  return (
    <div className="page-in">
      <div className="container-reg" style={{ paddingTop: 72, paddingBottom: 96 }}>
        <div className="eyebrow eyebrow-accent">Finance &middot; travel policy</div>
        <h1
          className="display"
          style={{
            fontSize: "clamp(44px, 11vw, 84px)",
            marginTop: 16,
            letterSpacing: "-0.03em",
            lineHeight: 0.95,
          }}
        >
          What&rsquo;s covered,
          <br />
          what&rsquo;s <em style={{ fontStyle: "italic" }}>not.</em>
        </h1>
        <p
          className="serif"
          style={{
            fontSize: 20,
            color: "var(--ink-70)",
            fontStyle: "italic",
            marginTop: 28,
            maxWidth: 620,
            lineHeight: 1.55,
          }}
        >
          Based on the {brand} travel policy.
          {slackChannel && (
            <> When in doubt, post in {slackChannel} before you book.</>
          )}
        </p>

        <div
          role="tablist"
          aria-label="Expense policy view"
          style={{
            marginTop: 56,
            display: "inline-flex",
            gap: 4,
            padding: 4,
            background: "var(--bg-deep)",
            borderRadius: 999,
          }}
        >
          {(
            [
              { v: "covered" as const, t: "Covered", n: covered.length },
              { v: "not" as const, t: "Not covered", n: notCovered.length },
              ...(hasHowTo
                ? [{ v: "how" as const, t: "How to submit" }]
                : []),
            ]
          ).map((o) => {
            const on = tab === o.v;
            const panelId = `expensing-panel-${o.v}`;
            return (
              <button
                key={o.v}
                role="tab"
                id={`expensing-tab-${o.v}`}
                aria-selected={on}
                aria-controls={panelId}
                onClick={() => setTab(o.v)}
                style={{
                  padding: "10px 20px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 500,
                  background: on ? "var(--ink)" : "transparent",
                  color: on ? "var(--bg)" : "var(--ink-70)",
                  transition: "all 0.2s",
                }}
              >
                {o.t}{" "}
                {o.n != null && (
                  <span
                    style={{
                      opacity: 0.6,
                      marginLeft: 6,
                      fontFamily: "var(--f-mono)",
                      fontSize: 11,
                    }}
                  >
                    {o.n}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* All three panels are mounted so the tab buttons' aria-controls
            always reference a real tabpanel; `hidden` hides the inactive
            ones from assistive tech and the visual tree alike. */}
        <div style={{ marginTop: 40 }}>
          <div
            role="tabpanel"
            id="expensing-panel-covered"
            aria-labelledby="expensing-tab-covered"
            hidden={tab !== "covered"}
            className={tab === "covered" ? "page-in" : undefined}
          >
            <PolicyList items={covered} tone="good" />
          </div>
          <div
            role="tabpanel"
            id="expensing-panel-not"
            aria-labelledby="expensing-tab-not"
            hidden={tab !== "not"}
            className={tab === "not" ? "page-in" : undefined}
          >
            <PolicyList items={notCovered} tone="bad" />
          </div>
          {hasHowTo && (
            <div
              role="tabpanel"
              id="expensing-panel-how"
              aria-labelledby="expensing-tab-how"
              hidden={tab !== "how"}
              className={tab === "how" ? "page-in" : undefined}
            >
              <HowToSubmit data={howToSubmit} />
            </div>
          )}
        </div>

        {submissionDeadline && (
          <div
            className="stack-mobile"
            style={{
              marginTop: 64,
              padding: 32,
              borderRadius: 18,
              background: "var(--ink)",
              color: "var(--bg)",
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: 28,
              alignItems: "center",
            }}
          >
            <div
              className="serif"
              style={{
                fontSize: 60,
                lineHeight: 1,
                fontStyle: "italic",
                color: "var(--clay)",
              }}
            >
              {submissionDeadline.date}
            </div>
            <div>
              <div className="eyebrow" style={{ color: "var(--clay)", marginBottom: 8 }}>
                Expense deadline
              </div>
              <div
                className="serif"
                style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.01em" }}
              >
                {submissionDeadline.body}
              </div>
              <div style={{ fontSize: 13, color: "rgba(245,240,232,0.7)", marginTop: 8 }}>
                No exceptions after this date. Attach receipts to all corp-card transactions.
              </div>
            </div>
            {travelToolUrl && (
              <a
                href={travelToolUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ background: "var(--terracotta)" }}
              >
                Open travel tool &rarr;
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PolicyList({
  items,
  tone,
}: {
  items: ExpenseItem[];
  tone: "good" | "bad";
}) {
  const color = tone === "good" ? "var(--teal)" : "var(--danger)";
  const mark = tone === "good" ? "\u2713" : "\u00d7";
  return (
    <div style={{ borderTop: "1px solid var(--ink-12)" }}>
      {items.map((x) => (
        <div
          key={x.title}
          style={{
            display: "grid",
            gridTemplateColumns: "48px 1fr",
            gap: 24,
            padding: "24px 4px",
            borderBottom: "1px solid var(--ink-12)",
            alignItems: "start",
          }}
        >
          <div
            aria-hidden
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: `1px solid ${color}`,
              color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontFamily: "var(--f-serif)",
              fontWeight: 400,
            }}
          >
            {mark}
          </div>
          <div>
            <div
              className="serif"
              style={{ fontSize: 20, fontWeight: 400, letterSpacing: "-0.005em" }}
            >
              {x.title}
            </div>
            <div
              style={{
                fontSize: 14,
                color: "var(--ink-70)",
                marginTop: 6,
                lineHeight: 1.6,
              }}
            >
              {x.detail}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HowToSubmit({
  data,
}: {
  data: { steps: HowToSubmitStep[]; callouts?: HowToSubmitCallout[] };
}) {
  return (
    <div>
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: `repeat(${data.steps.length}, minmax(0, 1fr))`,
        }}
      >
        {data.steps.map((step, i) => (
          <StepCard
            key={i}
            n={String(i + 1).padStart(2, "0")}
            title={step.title}
            detail={step.detail}
          />
        ))}
      </div>
      {data.callouts && data.callouts.length > 0 && (
        <div
          style={{
            display: "grid",
            gap: 16,
            marginTop: 16,
            gridTemplateColumns: `repeat(${data.callouts.length}, minmax(0, 1fr))`,
          }}
        >
          {data.callouts.map((c, i) => (
            <CalloutCard key={i} title={c.title} body={c.body} tone={c.tone ?? "warn"} />
          ))}
        </div>
      )}
    </div>
  );
}

function CalloutCard({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: "warn" | "teal";
}) {
  const palette =
    tone === "teal"
      ? {
          background: "var(--tint-teal)",
          border: "1px solid transparent",
          eyebrowColor: "var(--teal)",
        }
      : {
          background: "color-mix(in srgb, var(--warn) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--warn) 30%, transparent)",
          eyebrowColor: "var(--warn)",
        };
  return (
    <div style={{ padding: 24, borderRadius: 14, ...palette }}>
      <div className="eyebrow" style={{ color: palette.eyebrowColor }}>
        {title}
      </div>
      <p
        style={{
          fontSize: 14,
          color: "var(--ink-70)",
          marginTop: 10,
          lineHeight: 1.6,
        }}
      >
        {body}
      </p>
    </div>
  );
}

function StepCard({
  n,
  title,
  detail,
}: {
  n: string;
  title: string;
  detail: string;
}) {
  return (
    <div
      style={{
        padding: 24,
        borderRadius: 14,
        background: "var(--paper)",
        border: "1px solid var(--ink-12)",
      }}
    >
      <div
        className="serif"
        style={{
          fontSize: 40,
          color: "var(--terracotta)",
          fontStyle: "italic",
          fontWeight: 300,
          lineHeight: 1,
        }}
      >
        {n}
      </div>
      <div className="serif" style={{ fontSize: 20, fontWeight: 400, marginTop: 16 }}>
        {title}
      </div>
      <div
        style={{ fontSize: 13.5, color: "var(--ink-70)", marginTop: 10, lineHeight: 1.6 }}
      >
        {detail}
      </div>
    </div>
  );
}
