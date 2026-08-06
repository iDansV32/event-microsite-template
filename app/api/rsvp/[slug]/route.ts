import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { loadEvent, EventNotFoundError } from "@/lib/content";
import { env } from "@/lib/env";
import { swallowedError } from "@/lib/log";
import { authorizeEventRequest } from "@/lib/auth/guard";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { sendRsvpEmail, ResendError } from "@/lib/resend";
import { upsertRsvp, StorageError } from "@/lib/rsvp/storage";
import { RsvpInput, type RsvpIdentity } from "@/lib/schemas";

/**
 * POST /api/rsvp/[slug]
 *
 * 1. Rate-limit by (IP + slug). 5 submissions / 60 s.
 * 2. Full session-and-invite guard via authorizeEventRequest: cookie
 *    signature + expiry, invite row exists in Supabase, invite not
 *    revoked, invite.session_version matches the cookie's. A stale
 *    cookie whose attendee was revoked or whose session_version was
 *    bumped cannot write through this endpoint — same policy the
 *    /e/<slug> page tree enforces via the event layout.
 * 3. Identity (email + first/last name) is derived from the invite row.
 *    The client never sends these fields; identity is a server-side
 *    composition of { session.email, invite.first_name, invite.last_name }.
 *    Previously a transient Supabase read-failure on page render could
 *    cause the client to submit placeholder "—" names; now the writer
 *    and the authorizer share the same invite row, so either we have a
 *    real identity or we 500 / 401 before any DB mutation.
 * 4. Parse body with RsvpInput (now identity-free: attending + optional
 *    details only).
 * 5. Load the event. 404 if the slug doesn't exist or the registration
 *    section isn't enabled.
 * 6. If registration.isOpen is false, reject 409.
 * 7. Upsert into Supabase (service-role write). Storage helper handles
 *    the update-vs-insert and audit-log logic.
 * 8. Email a plain confirmation link (no ?t= token) via Resend. Auth is
 *    site-wide; the link just points at /e/<slug>/registration and
 *    middleware + magic-link handle re-auth on new devices.
 *
 * Errors:
 *   400 validation failure (zod, with field paths)
 *   401 no / invalid / revoked session (reason in the response body)
 *   404 event not found or registration not enabled
 *   409 registration closed for this event
 *   429 rate limited (includes Retry-After header)
 *   500 storage or email failure (message sanitised to a stable code)
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 5, windowMs: 60_000 };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  // 1 — Rate limit
  const key = clientKey(req.headers, `rsvp-submit:${slug}`);
  const rl = await rateLimit(key, RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterMs: rl.retryAfterMs },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
      },
    );
  }

  // 2 — Full session + invite + revocation guard. Middleware doesn't
  // match /api/rsvp/* (API routes shouldn't issue HTML redirects), so
  // the guard runs here. All non-success paths return 401 with a
  // reason code that clients can map to a login redirect.
  const auth = await authorizeEventRequest(slug, req.cookies);
  if (!auth.ok) {
    if (auth.reason === "db_error") {
      swallowedError("rsvp/auth-guard", auth.error);
      return NextResponse.json({ error: "storage_error" }, { status: 500 });
    }
    return NextResponse.json(
      { error: "unauthenticated", reason: auth.reason },
      { status: 401 },
    );
  }
  const identity: RsvpIdentity = {
    email: auth.session.email,
    firstName: auth.invite.first_name ?? "",
    lastName: auth.invite.last_name ?? "",
  };

  // 3 — Parse body (identity fields are NOT in the body — server derives)
  let parsed;
  try {
    const raw = await req.json();
    parsed = RsvpInput.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "validation", issues: err.issues.map(issueShape) },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "malformed_body" },
      { status: 400 },
    );
  }

  // 5 — Event + registration checks
  let bundle;
  try {
    bundle = loadEvent(slug);
  } catch (err) {
    if (err instanceof EventNotFoundError) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw err;
  }
  if (!bundle.meta.enabledSections.includes("registration")) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!bundle.content.registration.isOpen) {
    return NextResponse.json(
      { error: "registration_closed" },
      { status: 409 },
    );
  }

  // 6 — Upsert
  let row;
  try {
    row = await upsertRsvp(slug, identity, parsed);
  } catch (err) {
    return serverError(err, "storage_error");
  }

  // 7 — Send confirmation email. URL is a plain registration-page link;
  //     auth (cookie or magic link) handles access on re-visit.
  let editUrl: string;
  try {
    const base = env.publicSiteUrl().replace(/\/+$/, "");
    editUrl = `${base}/e/${slug}/registration`;
  } catch (err) {
    return serverError(err, "site_url_missing");
  }

  try {
    await sendRsvpEmail({
      to: row.email,
      firstName: row.first_name,
      attending: row.attending,
      brandClient: bundle.content.brand.client,
      eventShortName: bundle.content.brand.shortName,
      editUrl,
    });
  } catch (err) {
    // The RSVP itself succeeded — surface the email failure but don't roll
    // back. Attendee is persisted; a resend-link retry will fix it.
    swallowedError("rsvp/email-send", err);
    return NextResponse.json(
      {
        ok: true,
        persisted: true,
        emailSent: false,
        error: err instanceof ResendError ? "email_failed" : "email_error",
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    persisted: true,
    emailSent: true,
    maskedEmail: maskEmail(row.email),
  });
}

function serverError(err: unknown, code: string) {
  swallowedError("rsvp/post", err);
  const status = err instanceof StorageError ? 500 : 500;
  return NextResponse.json({ error: code }, { status });
}

function issueShape(issue: { path: PropertyKey[]; message: string }) {
  return {
    path: issue.path.map((p) => String(p)).join("."),
    message: issue.message,
  };
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const head = local.slice(0, 1);
  const tail = local.length > 2 ? local.slice(-1) : "";
  return `${head}${"*".repeat(Math.max(1, local.length - 2))}${tail}@${domain}`;
}
