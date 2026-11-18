"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { LogoMark } from "@/components/Logo";

const ERROR_MESSAGES: Record<string, string> = {
  missing_token: "That link is missing a verification code. Request a new one below.",
  invalid: "That link isn\u2019t valid. Request a new one below.",
  malformed: "That link isn\u2019t valid. Request a new one below.",
  signature_mismatch: "That link isn\u2019t valid. Request a new one below.",
  type_mismatch: "That link isn\u2019t a sign-in link. Request a new one below.",
  expired: "That sign-in link expired. Request a new one below.",
  slug_mismatch: "That link was for a different event. Request a new one below.",
  version_mismatch:
    "That link has been superseded. Request a new one below.",
  no_invite: "We couldn\u2019t find an invite for that email. Contact your organizer.",
  revoked: "Access to this event has been withdrawn. Contact your organizer.",
};

export function LoginView({
  slug,
  brand,
  eventShortName,
  eventTagline,
  next,
  errorCode,
}: {
  slug: string;
  brand: string;
  eventShortName: string;
  eventTagline: string;
  next?: string;
  errorCode?: string;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [inlineError, setInlineError] = useState<string | null>(null);

  const errorMessage =
    errorCode && ERROR_MESSAGES[errorCode] ? ERROR_MESSAGES[errorCode] : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInlineError(null);
    if (!email.trim()) {
      setInlineError("Enter your email.");
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email: email.trim(), next }),
      });
      if (res.status === 429) {
        setInlineError(
          "Too many sign-in requests. Wait a few minutes and try again.",
        );
        setState("idle");
        return;
      }
      // Always treat non-5xx as success for display purposes — the
      // response is enumeration-safe, so we never reveal whether the
      // email was matched. The user sees "check your email" either way.
      setState("sent");
    } catch {
      setInlineError("Couldn\u2019t reach the sign-in service. Try again.");
      setState("idle");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--surface)",
      }}
    >
      <div className="container" style={{ width: "100%", paddingTop: 20, paddingBottom: 20 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            minHeight: 44,
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          <LogoMark initial={brand} />
          {eventShortName}
        </span>
      </div>

      <main
        style={{
          flex: "1 1 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 16px 64px",
        }}
      >
        <div
          className="card card-lg"
          style={{
            width: "100%",
            maxWidth: 440,
            borderRadius: 24,
            boxShadow:
              "0 1px 2px color-mix(in srgb, var(--ink) 4%, transparent), 0 12px 32px color-mix(in srgb, var(--ink) 6%, transparent)",
          }}
        >
          <div className="kicker">Sign in</div>
          <h1
            style={{
              margin: "8px 0 0",
              fontSize: 32,
              lineHeight: 1.1,
              fontWeight: 600,
              letterSpacing: "-0.03em",
            }}
          >
            {eventShortName}
          </h1>
          <p className="body" style={{ marginTop: 12, lineHeight: 1.6 }}>
            {eventTagline}
          </p>

          {errorMessage && (
            <div
              role="alert"
              className="callout callout-danger"
              style={{ marginTop: 24, padding: "14px 16px", fontSize: 14 }}
            >
              <Icon name="alert" size={18} style={{ marginTop: 1 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {state === "sent" ? (
            <div style={{ marginTop: 28 }}>
              <div
                style={{
                  padding: 24,
                  borderRadius: 16,
                  background: "var(--accent-soft)",
                }}
              >
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    background: "var(--bg)",
                    color: "var(--accent)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="mail" size={20} strokeWidth={1.9} />
                </span>
                <h2
                  style={{
                    margin: "14px 0 0",
                    fontSize: 20,
                    fontWeight: 600,
                    letterSpacing: "-0.015em",
                  }}
                >
                  Check your email.
                </h2>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: "var(--ink-muted)",
                  }}
                >
                  If your email is invited to {eventShortName}, a sign-in link is
                  on its way. It&rsquo;s good for 15 minutes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setState("idle");
                  setEmail("");
                }}
                className="btn btn-secondary btn-block"
                style={{ marginTop: 12 }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              style={{
                marginTop: 28,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div>
                <label htmlFor="login-email" className="label">
                  Email
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={state === "sending"}
                />
              </div>
              {inlineError && (
                <div
                  role="alert"
                  className="callout callout-danger"
                  style={{ padding: "12px 16px", fontSize: 14 }}
                >
                  <Icon name="alert" size={18} style={{ marginTop: 1 }} />
                  <span>{inlineError}</span>
                </div>
              )}
              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={state === "sending"}
                style={{ marginTop: 4 }}
              >
                {state === "sending" ? (
                  "Sending\u2026"
                ) : (
                  <>
                    Send sign-in link
                    <Icon name="arrow-right" size={16} strokeWidth={2} />
                  </>
                )}
              </button>
            </form>
          )}

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              marginTop: 20,
              fontSize: 13,
              lineHeight: 1.5,
              color: "var(--ink-muted)",
            }}
          >
            <Icon name="lock" size={16} style={{ marginTop: 1 }} />
            <span>
              Access to {brand}&rsquo;s {eventShortName} is invite-only. If you
              believe you should have access, contact your organizer.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
