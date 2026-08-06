"use client";

import { useState } from "react";

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
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "48px 24px",
        background: "var(--bg)",
      }}
    >
      <div style={{ maxWidth: 480, width: "100%" }}>
        <div className="eyebrow eyebrow-accent">Sign in</div>
        <h1
          className="display"
          style={{
            fontSize: "clamp(40px, 9vw, 64px)",
            marginTop: 12,
            lineHeight: 0.98,
            letterSpacing: "-0.02em",
          }}
        >
          {eventShortName}.
        </h1>
        <p
          className="serif"
          style={{
            fontSize: 18,
            fontStyle: "italic",
            color: "var(--ink-70)",
            marginTop: 20,
            lineHeight: 1.5,
          }}
        >
          {eventTagline}
        </p>

        {errorMessage && (
          <div
            role="alert"
            style={{
              marginTop: 32,
              padding: "14px 18px",
              background: "color-mix(in srgb, var(--danger) 10%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--danger) 30%, transparent)",
              borderRadius: 12,
              fontSize: 14,
              color: "var(--danger)",
              lineHeight: 1.55,
            }}
          >
            {errorMessage}
          </div>
        )}

        {state === "sent" ? (
          <div
            style={{
              marginTop: 32,
              padding: 24,
              background: "var(--paper)",
              border: "1px solid var(--ink-12)",
              borderRadius: 14,
            }}
          >
            <div
              className="serif"
              style={{ fontSize: 20, fontWeight: 400, marginBottom: 10 }}
            >
              Check your email.
            </div>
            <p
              style={{
                fontSize: 14,
                color: "var(--ink-70)",
                lineHeight: 1.6,
              }}
            >
              If your email is invited to {eventShortName}, a sign-in link is
              on its way. It&rsquo;s good for 15 minutes.
            </p>
            <button
              type="button"
              onClick={() => {
                setState("idle");
                setEmail("");
              }}
              className="btn-link"
              style={{ marginTop: 16, fontSize: 13 }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            style={{
              marginTop: 32,
              display: "grid",
              gap: 16,
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={state === "sending"}
              />
            </div>
            {inlineError && (
              <div role="alert" style={{ fontSize: 13, color: "var(--terracotta)" }}>
                {inlineError}
              </div>
            )}
            <div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={state === "sending"}
              >
                {state === "sending" ? "Sending\u2026" : "Send sign-in link \u2192"}
              </button>
            </div>
          </form>
        )}

        <p
          style={{
            marginTop: 40,
            fontSize: 12,
            color: "var(--ink-55)",
            lineHeight: 1.5,
          }}
        >
          Access to {brand}&rsquo;s {eventShortName} is invite-only. If you
          believe you should have access, contact your organizer.
        </p>
      </div>
    </main>
  );
}
