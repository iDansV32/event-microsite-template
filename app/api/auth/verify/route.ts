import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { AuthTokenError, verifyToken } from "@/lib/auth/token";
import { issueSession, sessionCookieAttributes } from "@/lib/auth/session";
import { getInvite } from "@/lib/auth/storage";
import { safeNextPath } from "@/lib/auth/safe-next";

/**
 * GET /api/auth/verify?t=<magic-link-token>
 *
 * Clicking the magic link hits this endpoint. We:
 *   1. Verify the token's signature, type, expiry.
 *   2. Re-check the invite row in Supabase — it may have been revoked
 *      between link issuance and click.
 *   3. Re-check session_version — the token carries the version at
 *      issuance, and the DB version must still match (if an admin bumped
 *      it, every outstanding magic link dies at the same time).
 *   4. Mint a session cookie and redirect to the validated `next`.
 *
 * On any failure, redirect to /login/<slug>?error=<code>. We never
 * expose the raw token error to the user, but we do surface a short
 * code so the login page can render a human message ("link expired,
 * request a new one").
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");
  if (!token) {
    return redirectToFallbackLogin(req, "missing_token");
  }

  // 1. Signature + expiry.
  let payload;
  try {
    payload = await verifyToken(token, "magic");
  } catch (err) {
    const code = err instanceof AuthTokenError ? err.code : "invalid";
    return redirectToLogin(
      req,
      slugFromUnverifiedToken(token) ?? null,
      code,
    );
  }

  // 2. Invite still active?
  const invite = await getInvite(payload.slug, payload.email);
  if (!invite) {
    return redirectToLogin(req, payload.slug, "no_invite");
  }
  if (invite.revoked_at) {
    return redirectToLogin(req, payload.slug, "revoked");
  }

  // 3. Session version must still match.
  if (invite.session_version !== payload.version) {
    return redirectToLogin(req, payload.slug, "version_mismatch");
  }

  // 4. Mint the session cookie.
  const session = await issueSession({
    email: invite.email,
    slug: payload.slug,
    role: invite.role,
    version: invite.session_version,
  });
  const setCookie = sessionCookieAttributes({
    name: session.cookieName,
    value: session.token,
    path: session.cookiePath,
    maxAgeSec: session.maxAgeSec,
  });

  const target = safeNextPath(payload.slug, payload.next ?? null);
  const res = NextResponse.redirect(new URL(target, req.url));
  res.headers.append("Set-Cookie", setCookie);
  return res;
}

function redirectToLogin(req: NextRequest, slug: string | null, code: string) {
  // Login page lives at /login/<slug>, OUTSIDE the /e/<slug>/ session
  // gate. Pointing failures at /e/<slug>/login — as the previous version
  // did — hit a non-existent route AND got trapped by middleware,
  // which swallowed the `error` code in the bounce.
  const base = slug ? `/login/${slug}` : "/";
  const url = new URL(base, req.url);
  url.searchParams.set("error", code);
  return NextResponse.redirect(url);
}

function redirectToFallbackLogin(req: NextRequest, code: string) {
  // Reached only when we can't extract a slug at all (e.g. missing
  // token entirely). Root is safe — not session-gated, not event-
  // scoped — and shows a neutral "you need an event link" page.
  const url = new URL("/", req.url);
  url.searchParams.set("error", code);
  return NextResponse.redirect(url);
}

/**
 * Best-effort extraction of a slug from an UNVERIFIED token, used only
 * to send a failed-login user back to the right event's login page. We
 * don't trust the payload — the signature verification already failed —
 * but the slug-from-payload lets the UX degrade gracefully. Returns null
 * if the token doesn't parse.
 */
function slugFromUnverifiedToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  try {
    const payloadB64 = parts[0];
    const pad = payloadB64.length % 4 === 0 ? "" : "=".repeat(4 - (payloadB64.length % 4));
    const bin = atob(
      payloadB64.replace(/-/g, "+").replace(/_/g, "/") + pad,
    );
    const json = JSON.parse(bin) as { slug?: unknown };
    return typeof json.slug === "string" &&
      /^[a-z0-9]+(-[a-z0-9]+)*$/.test(json.slug)
      ? json.slug
      : null;
  } catch {
    return null;
  }
}
