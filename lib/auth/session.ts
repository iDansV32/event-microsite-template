/**
 * Session cookie read/write + issuance helpers.
 *
 * Runs in both the edge middleware (where cookies come off a NextRequest)
 * and Node route handlers (where we set cookies via response headers).
 * Keep this module edge-safe: no Node APIs.
 *
 * Cookie name is scoped per event: `event_session_<slug>`. This means:
 *   - Two different events in the same browser don't clobber each other.
 *   - A session for event A never leaks into requests for event B
 *     (the event's cookie name isn't in the request headers otherwise).
 *
 * Content is the signed session token from lib/auth/token.ts. The server
 * is the single source of truth for session validity — the cookie is
 * just a bearer credential.
 */

import {
  SESSION_ABSOLUTE_TTL_SEC,
  SESSION_SLIDING_REFRESH_SEC,
  SESSION_SLIDING_TTL_SEC,
  signToken,
  verifyToken,
  type SessionPayload,
} from "./token";

/** Path used by the cookie. Scoped to /e/<slug>/ so middleware can
    reliably identify which event a request is for even if the client is
    mucking with headers. We also encode slug in the name; the path is
    belt-and-suspenders. */
export function sessionCookieName(slug: string): string {
  return `event_session_${slug}`;
}

// slug is threaded through so future path-scoping changes touch one
// place. Today every session cookie uses `/` because the cookie needs
// to reach BOTH the page tree (/e/<slug>/...) AND the API tree
// (/api/rsvp/<slug>, /api/auth/logout, etc.) on the same request. Event
// isolation comes from the NAME (event_session_<slug>); middleware
// and route handlers look up only the cookie name matching the slug
// they're serving, so a cookie for event A is ignored by event B even
// though the browser carries it along.
export function sessionCookiePath(_slug: string): string {
  return "/";
}

export interface SessionIssueInput {
  email: string;
  slug: string;
  role: SessionPayload["role"];
  version: number;
}

export interface IssuedSession {
  token: string;
  payload: SessionPayload;
  cookieName: string;
  cookiePath: string;
  maxAgeSec: number;
}

/**
 * Mint a fresh session for a just-verified magic link. New sessions get
 * the full absolute lifetime and a fresh sliding window.
 */
export async function issueSession(
  input: SessionIssueInput,
): Promise<IssuedSession> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    type: "session",
    email: input.email,
    slug: input.slug,
    role: input.role,
    version: input.version,
    iat: now,
    abs_exp: now + SESSION_ABSOLUTE_TTL_SEC,
    sld_exp: now + SESSION_SLIDING_TTL_SEC,
  };
  const token = await signToken(payload);
  return {
    token,
    payload,
    cookieName: sessionCookieName(input.slug),
    cookiePath: sessionCookiePath(input.slug),
    maxAgeSec: SESSION_ABSOLUTE_TTL_SEC,
  };
}

/**
 * Given an existing valid session payload, decide whether the sliding
 * window should be refreshed. When sliding_exp drops below
 * SESSION_SLIDING_REFRESH_SEC, we mint a new cookie. Absolute expiry is
 * NEVER extended — the only escape from that is a new login.
 */
export interface RefreshedSession {
  token: string;
  payload: SessionPayload;
  cookieName: string;
  cookiePath: string;
  /**
   * Seconds until absolute expiry. Stored in the cookie's Max-Age so the
   * browser drops the cookie at the same time the server would reject it.
   */
  maxAgeSec: number;
}

export async function maybeRefreshSession(
  current: SessionPayload,
): Promise<RefreshedSession | null> {
  const now = Math.floor(Date.now() / 1000);
  const remainingSliding = current.sld_exp - now;
  if (remainingSliding > SESSION_SLIDING_REFRESH_SEC) return null;

  const newSldExp = Math.min(now + SESSION_SLIDING_TTL_SEC, current.abs_exp);
  const refreshed: SessionPayload = {
    ...current,
    sld_exp: newSldExp,
  };
  const token = await signToken(refreshed);
  return {
    token,
    payload: refreshed,
    cookieName: sessionCookieName(current.slug),
    cookiePath: sessionCookiePath(current.slug),
    maxAgeSec: Math.max(0, current.abs_exp - now),
  };
}

/**
 * Read + verify the session cookie out of a request's cookies. Returns
 * the payload on success, null on any failure (missing cookie, bad
 * signature, expired, type mismatch, slug mismatch).
 *
 * Verification is done with the given slug guard so a cookie named after
 * event A can't be injected into a request for event B by a client that
 * sets its own headers. The HMAC payload also carries the slug for
 * defense-in-depth.
 */
export async function readSessionCookie(
  cookies: {
    get: (name: string) => { value: string } | undefined;
  },
  slug: string,
): Promise<SessionPayload | null> {
  const cookie = cookies.get(sessionCookieName(slug));
  if (!cookie?.value) return null;
  try {
    return await verifyToken(cookie.value, "session", { slug });
  } catch {
    return null;
  }
}

/**
 * Serialise a cookie attributes set suitable for `Set-Cookie` headers.
 * We write these manually (vs using `res.cookies.set`) because middleware
 * sometimes needs to set cookies on NextResponse.rewrite() results where
 * the cookies API is awkward.
 */
export function sessionCookieAttributes(opts: {
  name: string;
  value: string;
  path: string;
  maxAgeSec: number;
}): string {
  const parts = [
    `${opts.name}=${opts.value}`,
    `Path=${opts.path}`,
    `Max-Age=${opts.maxAgeSec}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  // Only mark Secure in non-dev — localhost over http would otherwise drop
  // the cookie silently. Prod deploys are https; this branch lets local
  // dev flow work without a Vercel preview.
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

/** Serialise a clearing cookie (Max-Age=0). */
export function clearSessionCookieAttributes(slug: string): string {
  return sessionCookieAttributes({
    name: sessionCookieName(slug),
    value: "",
    path: sessionCookiePath(slug),
    maxAgeSec: 0,
  });
}
