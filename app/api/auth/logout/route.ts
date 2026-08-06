import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { clearSessionCookieAttributes } from "@/lib/auth/session";

/**
 * POST /api/auth/logout  { slug }
 *
 * Clears the event-scoped session cookie and redirects to the event's
 * login page. Accepts a POST (not GET) to avoid link-preview prefetches
 * logging people out.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(128),
});

export async function POST(req: NextRequest) {
  let parsed: z.infer<typeof Body>;
  try {
    const raw = await req.json();
    parsed = Body.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "validation" }, { status: 400 });
    }
    return NextResponse.json({ error: "malformed_body" }, { status: 400 });
  }

  const res = NextResponse.json({
    ok: true,
    redirect: `/login/${parsed.slug}`,
  });
  res.headers.append("Set-Cookie", clearSessionCookieAttributes(parsed.slug));
  return res;
}
