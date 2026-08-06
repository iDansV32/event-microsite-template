"use client";

import { useState } from "react";
import type { FaqItem } from "@/lib/schemas";

export function FaqView({
  items,
  slackChannel,
}: {
  items: FaqItem[];
  slackChannel?: string;
}) {
  const [open, setOpen] = useState<number>(0);
  return (
    <div className="page-in">
      <div className="container-read" style={{ paddingTop: 72, paddingBottom: 120 }}>
        <div className="eyebrow eyebrow-accent">Got questions?</div>
        <h1
          className="display"
          style={{
            fontSize: "clamp(44px, 11vw, 84px)",
            marginTop: 16,
            letterSpacing: "-0.03em",
            lineHeight: 0.95,
          }}
        >
          We&rsquo;ve got
          <br />
          <em style={{ fontStyle: "italic" }}>answers.</em>
        </h1>
        {slackChannel && (
          <p
            className="serif"
            style={{
              fontSize: 20,
              color: "var(--ink-70)",
              fontStyle: "italic",
              marginTop: 28,
              lineHeight: 1.55,
            }}
          >
            If you don&rsquo;t see what you need, post in{" "}
            <strong style={{ color: "var(--terracotta)", fontStyle: "normal" }}>
              {slackChannel}
            </strong>{" "}
            on Slack.
          </p>
        )}

        <div style={{ marginTop: 64, borderTop: "1px solid var(--ink-12)" }}>
          {items.map((item, i) => {
            const isOpen = open === i;
            const panelId = `faq-panel-${i}`;
            const buttonId = `faq-button-${i}`;
            return (
              <div key={i} style={{ borderBottom: "1px solid var(--ink-12)" }}>
                <button
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  style={{
                    width: "100%",
                    padding: "28px 0",
                    display: "grid",
                    gridTemplateColumns: "48px 1fr 40px",
                    gap: 20,
                    alignItems: "baseline",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div
                    className="mono"
                    style={{
                      fontSize: 12,
                      color: "var(--ink-55)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div
                    className="serif"
                    style={{
                      fontSize: 22,
                      fontWeight: 400,
                      letterSpacing: "-0.005em",
                      lineHeight: 1.35,
                    }}
                  >
                    {item.q}
                  </div>
                  <div
                    aria-hidden
                    className="serif"
                    style={{
                      fontSize: 28,
                      color: "var(--terracotta)",
                      fontStyle: "italic",
                      fontWeight: 300,
                      transition: "transform 0.3s",
                      transform: isOpen ? "rotate(45deg)" : "rotate(0)",
                      textAlign: "right",
                      lineHeight: 1,
                    }}
                  >
                    +
                  </div>
                </button>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!isOpen}
                  style={{
                    maxHeight: isOpen ? 400 : 0,
                    overflow: "hidden",
                    transition: "max-height 0.35s ease, opacity 0.25s",
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  <div
                    style={{
                      padding: "4px 0 36px 68px",
                      fontSize: 16,
                      color: "var(--ink-70)",
                      lineHeight: 1.7,
                      maxWidth: 600,
                    }}
                  >
                    {item.a}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {slackChannel && (
          <div
            style={{
              marginTop: 80,
              padding: 40,
              borderRadius: 18,
              background: "var(--paper)",
              border: "1px solid var(--ink-12)",
              textAlign: "center",
            }}
          >
            <div
              className="script"
              style={{
                fontSize: 40,
                color: "var(--terracotta)",
                transform: "rotate(-2deg)",
                display: "inline-block",
              }}
            >
              still stumped?
            </div>
            <p
              style={{
                fontSize: 15,
                color: "var(--ink-70)",
                marginTop: 12,
                lineHeight: 1.6,
              }}
            >
              The events team is in Slack at{" "}
              <strong style={{ color: "var(--ink)" }}>{slackChannel}</strong>{" "}
              &mdash; fastest way to get an answer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
