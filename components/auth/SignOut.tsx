"use client";

import { useCallback, useState } from "react";

/**
 * Sign-out UI primitives.
 *
 * The underlying action is the same for every variant: POST the slug to
 * /api/auth/logout, then hard-navigate to /login/<slug>. Hard nav (not
 * router.push) so the browser re-fetches with the cleared cookie and
 * no stale client state survives the handoff.
 *
 * Two variants:
 *
 *   <SessionBadge slug email />    "Signed in as X \u00b7 Sign out"
 *     Inline chrome for the happy path (attendee Nav, internal layout).
 *     Shows the caller's email so a wrong-session situation is visible
 *     at a glance \u2014 exactly the footgun that tripped the live-infra
 *     pass (attendee cookie looked like broken exports).
 *
 *   <SignOutButton slug label />    standalone button
 *     For error screens where we want a single CTA, e.g. Forbidden
 *     ("Sign in as a different account") or TemporarilyUnavailable.
 *     No identity displayed \u2014 the caller may or may not have a
 *     trustworthy session on hand.
 */

async function doSignOut(slug: string): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
  } catch {
    // Even if the POST fails, we still navigate to login. If the cookie
    // wasn't cleared on the server side, the login page will either
    // re-auth them into a fresh session or show them re-signed-in.
  }
  window.location.assign(`/login/${slug}`);
}

export function SessionBadge({
  slug,
  email,
}: {
  slug: string;
  email: string;
}) {
  const [pending, setPending] = useState(false);

  const onClick = useCallback(async () => {
    if (pending) return;
    setPending(true);
    await doSignOut(slug);
  }, [pending, slug]);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        fontSize: 14,
        color: "var(--ink-muted)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          background: "var(--accent-soft)",
          color: "var(--accent)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          flex: "0 0 auto",
        }}
      >
        {email.slice(0, 1).toUpperCase()}
      </span>
      <span
        className="nav-visitor-name"
        title={email}
        style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
      >
        <span className="sr-only">Signed in as </span>
        {email}
      </span>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="btn btn-secondary btn-sm"
        style={{ cursor: pending ? "wait" : "pointer" }}
      >
        {pending ? "Signing out\u2026" : "Sign out"}
      </button>
    </div>
  );
}

export function SignOutButton({
  slug,
  label = "Sign in as a different account",
}: {
  slug: string;
  label?: string;
}) {
  const [pending, setPending] = useState(false);

  const onClick = useCallback(async () => {
    if (pending) return;
    setPending(true);
    await doSignOut(slug);
  }, [pending, slug]);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="btn btn-secondary"
      style={{ cursor: pending ? "wait" : "pointer" }}
    >
      {pending ? "Signing out\u2026" : label}
    </button>
  );
}
