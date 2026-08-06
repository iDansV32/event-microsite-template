import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { loadEvent, EventNotFoundError } from "@/lib/content";
import { env } from "@/lib/env";
import { swallowedError } from "@/lib/log";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { sendLoginEmail } from "@/lib/auth/invite-email";
import { safeNextPath } from "@/lib/auth/safe-next";
import { getActiveInvite } from "@/lib/auth/storage";
import {
  MAGIC_LINK_TTL_SEC,
  signToken,
  type MagicLinkPayload,
} from "@/lib/auth/token";

/**
 * POST /api/auth/login
 *
 * Body: { slug, email, next? }
 *
 * Response is ALWAYS the same generic 200 body, whether or not the email
 * has an active invite, whether or not the slug exists, whether or not
 * Resend is configured. The actual magic-link work runs in-request but
 * failures are swallowed so the response shape stays identical —
 * enumeration-safe by design.
 *
 * Rate-limited on TWO keys in parallel:
 *     per-email:  3 / hour   blocks inbox spray against one attendee
 *     per-IP:    10 / minute blocks spray across many emails
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT_PER_EMAIL = { limit: 3, windowMs: 60 * 60_000 };
const RATE_LIMIT_PER_IP = { limit: 10, windowMs: 60_000 };

const GENERIC_RESPONSE = {
  ok: true,
  message: "If that email is invited, you'll get a sign-in link shortly.",
};

const LoginRouteBody = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "invalid slug")
    .max(128),
  email: z.string().trim().toLowerCase().email().max(254),
  next: z.string().max(512).optional(),
});

export async function POST(req: NextRequest) {
  let parsed: z.infer<typeof LoginRouteBody>;
  try {
    const raw = await req.json();
    parsed = LoginRouteBody.parse(raw);
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

  const ipKey = clientKey(req.headers, "auth-login-ip");
  const ipCheck = await rateLimit(ipKey, RATE_LIMIT_PER_IP);
  if (!ipCheck.allowed) {
    return NextResponse.json(GENERIC_RESPONSE, {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(ipCheck.retryAfterMs / 1000)) },
    });
  }
  const emailCheck = await rateLimit(
    `auth-login:${parsed.slug}:${parsed.email}`,
    RATE_LIMIT_PER_EMAIL,
  );
  if (!emailCheck.allowed) {
    return NextResponse.json(GENERIC_RESPONSE, {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(emailCheck.retryAfterMs / 1000)) },
    });
  }

  const safeNext = safeNextPath(parsed.slug, parsed.next ?? null);

  try {
    await issueMagicLink(parsed.slug, parsed.email, safeNext);
  } catch (err) {
    swallowedError("auth/login", err);
  }

  return NextResponse.json(GENERIC_RESPONSE);
}

async function issueMagicLink(
  slug: string,
  email: string,
  next: string,
): Promise<void> {
  // Gate: event must exist AND registration/login must be enabled.
  // Treat an unknown slug as a no-op — same as an unmatched email.
  let bundle;
  try {
    bundle = loadEvent(slug);
  } catch (err) {
    if (err instanceof EventNotFoundError) return;
    throw err;
  }

  const invite = await getActiveInvite(slug, email);
  if (!invite) return;

  const now = Math.floor(Date.now() / 1000);
  const payload: MagicLinkPayload = {
    type: "magic",
    email: invite.email,
    slug,
    version: invite.session_version,
    exp: now + MAGIC_LINK_TTL_SEC,
    next,
  };
  const token = await signToken(payload);

  const base = env.publicSiteUrl().replace(/\/+$/, "");
  const magicUrl = `${base}/api/auth/verify?t=${encodeURIComponent(token)}`;

  await sendLoginEmail({
    to: invite.email,
    firstName: invite.first_name,
    brandClient: bundle.content.brand.client,
    eventShortName: bundle.content.brand.shortName,
    magicUrl,
    expiresInMinutes: Math.floor(MAGIC_LINK_TTL_SEC / 60),
  });
}
