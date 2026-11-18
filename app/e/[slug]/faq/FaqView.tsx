"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import type { FaqItem } from "@/lib/schemas";

export function FaqView({
  items,
  eventName,
  slackChannel,
  supportEmail,
  links,
}: {
  items: FaqItem[];
  eventName: string;
  slackChannel?: string;
  supportEmail?: string;
  /** Related pages for the side panel — only sections the event enables. */
  links: { href: string; label: string }[];
}) {
  // Each answer toggles independently; the first one starts open.
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set([0]));
  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const hasContact = !!(slackChannel || supportEmail);
  const hasSide = hasContact || links.length > 0;

  return (
    <div className="page-in">
      <PageHeader
        eyebrow="FAQ"
        title="Questions, answered"
        lede={`The things people ask most about ${eventName}.`}
      />

      <div className="container page-end" style={{ paddingTop: 40 }}>
        <div className="split">
          <div className="split-main rows">
            {items.map((item, i) => {
              const isOpen = open.has(i);
              const panelId = `faq-panel-${i}`;
              const buttonId = `faq-button-${i}`;
              return (
                <div key={i}>
                  <h2 style={{ margin: 0 }}>
                    <button
                      type="button"
                      id={buttonId}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggle(i)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 24,
                        padding: "20px 0",
                        minHeight: 64,
                        fontSize: 17,
                        fontWeight: 600,
                        letterSpacing: "-0.01em",
                        lineHeight: 1.4,
                        color: "var(--ink)",
                        textAlign: "left",
                      }}
                    >
                      <span>{item.q}</span>
                      <span
                        className="transition-transform duration-200 motion-reduce:transition-none"
                        style={{
                          flex: "0 0 auto",
                          width: 32,
                          height: 32,
                          borderRadius: 999,
                          background: "var(--surface-2)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: isOpen ? "rotate(180deg)" : "none",
                        }}
                      >
                        <Icon name="chevron-down" size={16} strokeWidth={2} />
                      </span>
                    </button>
                  </h2>
                  <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!isOpen}>
                    <p
                      style={{
                        margin: 0,
                        padding: "0 56px 22px 0",
                        fontSize: 16,
                        lineHeight: 1.65,
                        color: "var(--ink-muted)",
                      }}
                    >
                      {item.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {hasSide && (
            <aside
              className="split-side sticky-side"
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              {hasContact && (
                <div className="panel">
                  <span className="icon-tile">
                    <Icon name="message" size={20} />
                  </span>
                  <h2
                    className="h3"
                    style={{ marginTop: 16, fontSize: 20, letterSpacing: "-0.015em" }}
                  >
                    Still have questions?
                  </h2>
                  <p className="body" style={{ marginTop: 8, lineHeight: 1.6 }}>
                    {slackChannel ? (
                      <>
                        Post in{" "}
                        <span style={{ color: "var(--ink)", fontWeight: 500 }}>
                          {slackChannel}
                        </span>{" "}
                        on Slack — the fastest way to reach the events team.
                      </>
                    ) : (
                      <>Email the events team and we’ll get back to you.</>
                    )}
                  </p>
                  {supportEmail && (
                    <a
                      href={`mailto:${supportEmail}`}
                      className="btn btn-secondary btn-block"
                      style={{ marginTop: 20, whiteSpace: "normal", overflowWrap: "anywhere" }}
                    >
                      {supportEmail}
                    </a>
                  )}
                </div>
              )}

              {links.length > 0 && (
                <nav
                  aria-label="Related pages"
                  style={{ display: "flex", flexDirection: "column", padding: "0 4px" }}
                >
                  {links.map((l, i) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        minHeight: 44,
                        fontSize: 15,
                        fontWeight: 500,
                        color: "var(--ink)",
                        borderBottom:
                          i === links.length - 1 ? undefined : "1px solid var(--line)",
                      }}
                    >
                      {l.label}
                      <Icon
                        name="arrow-right"
                        size={16}
                        strokeWidth={2}
                        style={{ color: "var(--ink-muted)" }}
                      />
                    </Link>
                  ))}
                </nav>
              )}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
