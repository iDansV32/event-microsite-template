import { NextResponse, type NextRequest } from "next/server";
import {
  maybeRefreshSession,
  readSessionCookie,
  sessionCookieAttributes,
} from "@/lib/auth/session";
import { isDraftPreviewEnabled } from "@/lib/preview";

/**
 * Session gate for every per-event surface.
 *
 *   /e/<slug>/*          attendee pages  — page mode (HTML redirect)
 *   /internal/<slug>/*   organizer pages — page mode (HTML redirect)
 *   /api/internal/<slug>/*  organizer API  — api mode (JSON 401)
 *
 * Middleware only checks cookie signature + expiry (cheap, runs on every
 * request). DB-backed authorization — invite still active, role is
 * organizer for /internal surfaces — happens in the layout and route
 * handlers via lib/auth/guard.
 *
 * The old HTTP Basic Auth path on /internal/* is gone. Organizer access
 * is now per-person via the invited_attendees table's `role` column,
 * same magic-link login flow as attendees.
 *
 * /api/rsvp/* and /api/auth/* are deliberately NOT matched. /api/rsvp/*
 * runs its own session+revocation guard inside the route (and must
 * respond with API-shaped JSON rather than redirects); /api/auth/* must
 * be reachable without a session by definition.
 */

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

type GateMode = "page" | "api";

function extractSlug(pathname: string, prefix: string): string | null {
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  const slug = rest.split("/", 1)[0];
  if (!slug || !SLUG_RE.test(slug)) return null;
  return slug;
}

async function sessionGate(
  req: NextRequest,
  slug: string,
  mode: GateMode,
): Promise<NextResponse> {
  const session = await readSessionCookie(req.cookies, slug);
  if (!session) {
    if (mode === "api") {
      return NextResponse.json(
        { error: "unauthenticated", reason: "no_session" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }
    const nextPath = req.nextUrl.pathname + req.nextUrl.search;
    const loginUrl = new URL(`/login/${slug}`, req.url);
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  // Sliding refresh — re-issue the cookie when close to sld_exp.
  const refreshed = await maybeRefreshSession(session);
  if (!refreshed) return NextResponse.next();

  const res = NextResponse.next();
  res.headers.append(
    "Set-Cookie",
    sessionCookieAttributes({
      name: refreshed.cookieName,
      value: refreshed.token,
      path: refreshed.cookiePath,
      maxAgeSec: refreshed.maxAgeSec,
    }),
  );
  return res;
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // Organizer API — JSON errors, no redirects.
  if (pathname.startsWith("/api/internal/")) {
    const slug = extractSlug(pathname, "/api/internal/");
    if (!slug) return NextResponse.next();
    return await sessionGate(req, slug, "api");
  }

  // Organizer pages — HTML redirect to login.
  if (pathname.startsWith("/internal/")) {
    const slug = extractSlug(pathname, "/internal/");
    if (!slug) return NextResponse.next();
    return await sessionGate(req, slug, "page");
  }

  // Attendee pages.
  if (pathname.startsWith("/e/")) {
    const slug = extractSlug(pathname, "/e/");
    if (!slug) return NextResponse.next();
    // Draft-preview mode: skip the middleware session gate so the
    // layout can load the event and decide based on meta.status. A
    // published event still hits the layout's auth check and gets
    // redirected; only drafts actually become unauthenticated-browsable.
    // Note: /internal/*, /api/internal/*, /api/rsvp/* are NOT matched
    // here; preview mode is deliberately scoped to public attendee pages.
    if (isDraftPreviewEnabled()) return NextResponse.next();
    return await sessionGate(req, slug, "page");
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/internal/:path*",
    "/api/internal/:path*",
    "/e/:slug/:path*",
  ],
};
