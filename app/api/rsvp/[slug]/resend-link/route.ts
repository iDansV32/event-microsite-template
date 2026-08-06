import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { loadEvent, EventNotFoundError } from "@/lib/content";
import { env } from "@/lib/env";
import { swallowedError } from "@/lib/log";
import { rateLimit } from "@/lib/rate-limit";
import { sendRsvpEmail } from "@/lib/resend";
import { getRsvpByEmail } from "@/lib/rsvp/storage";
import { ResendLinkInput } from "@/lib/schemas";

/**
 * POST /api/rsvp/[slug]/resend-link
 *
 * Re-sends the RSVP confirmation email for an existing RSVP. The email
 * contains a plain /e/<slug>/registration link — not a standalone
 * credential — because auth is site-wide via magic link. Users on a new
 * device click through, get bounced to login, and land back at the
 * registration page with their RSVP pre-filled off session email.
 *
 * Previously this endpoint also rotated an HMAC'd edit token
 * (token_version++ in the DB), but that token is no longer read
 * anywhere. The only behavior that matters now is "send the email
 * again."
 *
 * Response-shape policy — the 200 body is intentionally identical
 * whether or not the email has an RSVP, so a curious actor cannot use
 * this endpoint to enumerate attendees via the response body.
 *
 * Timing leak note — real sends take ~200\u2013500ms (DB + Resend); misses
 * return near-instantly. The 3-per-hour-per-email rate limit is the
 * primary defence against enumeration.
 *
 * Rate-limited by normalised email (not IP) so a spammer can't hit one
 * inbox from many IPs.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 3, windowMs: 60 * 60_000 }; // 3/hour per email

const GENERIC_RESPONSE = {
  ok: true,
  message: "If that email has an RSVP, you'll get a new link shortly.",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let parsed;
  try {
    const raw = await req.json();
    parsed = ResendLinkInput.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "validation", message: GENERIC_RESPONSE.message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "malformed_body", message: GENERIC_RESPONSE.message },
      { status: 400 },
    );
  }

  const rl = await rateLimit(`rsvp-resend:${slug}:${parsed.email}`, RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(GENERIC_RESPONSE, {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
    });
  }

  let bundle;
  try {
    bundle = loadEvent(slug);
  } catch (err) {
    if (err instanceof EventNotFoundError) {
      return NextResponse.json(GENERIC_RESPONSE);
    }
    throw err;
  }
  if (!bundle.meta.enabledSections.includes("registration")) {
    return NextResponse.json(GENERIC_RESPONSE);
  }

  // Do the work in-request. Any failure below is swallowed so the caller
  // can't distinguish "no RSVP" from "storage down" from "email failed".
  try {
    await resendConfirmation(slug, parsed.email, bundle);
  } catch (err) {
    swallowedError("rsvp/resend-link", err);
  }

  return NextResponse.json(GENERIC_RESPONSE);
}

async function resendConfirmation(
  slug: string,
  email: string,
  bundle: ReturnType<typeof loadEvent>,
): Promise<void> {
  const existing = await getRsvpByEmail(slug, email);
  if (!existing) return; // Enumeration-safe no-op.

  const base = env.publicSiteUrl().replace(/\/+$/, "");
  const editUrl = `${base}/e/${slug}/registration`;

  await sendRsvpEmail({
    to: existing.email,
    firstName: existing.first_name,
    attending: existing.attending,
    brandClient: bundle.content.brand.client,
    eventShortName: bundle.content.brand.shortName,
    editUrl,
  });
}
