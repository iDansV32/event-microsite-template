import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { MissingEnvError } from "@/lib/env";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import {
  TALLY_SIGNATURE_HEADER,
  TallyWebhookPayload,
  findSlugByFormId,
  hiddenFieldValue,
  readBodyCapped,
  verifyTallySignature,
} from "@/lib/feedback/webhook";
import {
  FeedbackStorageError,
  insertFeedbackResponse,
} from "@/lib/feedback/storage";

/**
 * POST /api/webhooks/tally
 *
 * Inbound Tally form submissions. No session auth — the caller is
 * Tally's servers — so trust is established by the HMAC signature
 * alone, and everything before that verification step treats the
 * request as hostile.
 *
 * Deliberately NOT matched by middleware (matcher covers /internal,
 * /api/internal and /e only); this handler owns its full request
 * pipeline:
 *
 *   1. Content-Length precheck > 256 KB        → 413 (fast fail)
 *   2. Rate limit per IP, 60/min               → 429 + Retry-After
 *   3. Capped stream read (the REAL bound)     → 413 (header can lie)
 *   4. TALLY_SIGNING_SECRET unset              → 500 (fail closed;
 *      Tally's retry schedule re-delivers once config lands)
 *   5. HMAC verify over raw bytes              → 401 (fail closed)
 *      ── everything below trusts the payload came from Tally ──
 *   6. JSON.parse / lenient Zod parse          → 400 + loud log.
 *      400 (not 200-and-drop) is deliberate: schema drift surfaces as
 *      failed deliveries in Tally's dashboard, which supports manual
 *      redelivery after we fix the parser. Data is never lost — Tally
 *      retains every submission.
 *   7. eventType !== FORM_RESPONSE             → 200 ignored (a retry
 *      can't change the type, so failing would just spin Tally's
 *      retry loop for nothing)
 *   8. formId → slug reverse lookup fails      → 422 + loud log
 *      (visible failure in Tally; redeliver after the event deploys).
 *      This is the anti-spoof boundary: the slug comes from formId,
 *      never from the respondent-tamperable hidden fields.
 *   9. Hidden `event` field mismatch           → log only, formId wins.
 *      No feedback.isOpen gate — the submission already happened on
 *      Tally's side; rejecting our copy only desyncs the mirror.
 *  10. Insert; duplicate submission id         → 200 {duplicate:true}
 *      (idempotency: Tally retries and replayed captures both land
 *      here); other storage failure → 500 so Tally's retry loop acts
 *      as our reliability mechanism for transient DB blips.
 *  11. 200 {ok:true}
 *
 * Logging here uses console.error directly (not swallowedError, which
 * is dev-only): webhook failures in production are otherwise invisible
 * outside Tally's delivery dashboard.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 256 * 1024;
const RATE_LIMIT = { limit: 60, windowMs: 60_000 };

export async function POST(req: NextRequest) {
  // 1 — Fast precheck on the declared length.
  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  // 2 — Rate limit per IP. Generous: Tally retries on 429, and the key
  // is per-IP so an attacker only exhausts their own bucket.
  const rl = await rateLimit(clientKey(req.headers, "tally-webhook"), RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterMs: rl.retryAfterMs },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
      },
    );
  }

  // 3 — Capped stream read. Raw bytes are captured before any parsing
  // because the HMAC covers exactly what was sent.
  const body = await readBodyCapped(req, MAX_BODY_BYTES);
  if (!body.ok) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  // 4 — Secret. Fail closed on missing config.
  let secret: string;
  try {
    secret = env.tally.signingSecret();
  } catch (err) {
    if (err instanceof MissingEnvError) {
      // eslint-disable-next-line no-console
      console.error("[tally-webhook] TALLY_SIGNING_SECRET is not set; rejecting delivery");
      return NextResponse.json({ error: "misconfigured" }, { status: 500 });
    }
    throw err;
  }

  // 5 — Signature. Everything after this line trusts the payload.
  const signature = req.headers.get(TALLY_SIGNATURE_HEADER);
  if (!verifyTallySignature(body.raw, signature, secret)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  // 6 — Parse.
  let json: unknown;
  try {
    json = JSON.parse(body.raw);
  } catch {
    return NextResponse.json({ error: "malformed_body" }, { status: 400 });
  }
  const parsed = TallyWebhookPayload.safeParse(json);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error(
      "[tally-webhook] payload failed schema parse — Tally schema drift?",
      parsed.error.issues,
    );
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }
  const payload = parsed.data;

  // 7 — Only form responses are stored.
  if (payload.eventType !== "FORM_RESPONSE") {
    return NextResponse.json({ ok: true, ignored: "event_type" });
  }

  // 8 — Resolve the event from the non-spoofable formId.
  const slug = findSlugByFormId(payload.data.formId);
  if (!slug) {
    // eslint-disable-next-line no-console
    console.error(
      `[tally-webhook] signed delivery for unknown formId=${payload.data.formId} — form/event wiring drift; redeliver from Tally after fixing`,
    );
    return NextResponse.json({ error: "unknown_form" }, { status: 422 });
  }

  // 9 — Cross-check the respondent-supplied hidden field; log-only.
  const hiddenSlug = hiddenFieldValue(payload.data.fields, "event");
  if (hiddenSlug && hiddenSlug !== slug) {
    // eslint-disable-next-line no-console
    console.error(
      `[tally-webhook] hidden event field "${hiddenSlug}" disagrees with formId-resolved slug "${slug}" (submission ${payload.data.submissionId}) — likely URL tampering or a stale link; storing under the resolved slug`,
    );
  }

  // 10 — Idempotent insert.
  try {
    const { inserted } = await insertFeedbackResponse({
      event_slug: slug,
      tally_form_id: payload.data.formId,
      tally_event_id: payload.eventId ?? "",
      tally_submission_id: payload.data.submissionId,
      respondent_token: hiddenFieldValue(payload.data.fields, "respondent"),
      submitted_at: payload.data.createdAt ?? null,
      payload: payload as unknown as Record<string, unknown>,
    });
    if (!inserted) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
  } catch (err) {
    if (err instanceof FeedbackStorageError) {
      // eslint-disable-next-line no-console
      console.error("[tally-webhook] storage failure; Tally will retry", err.message);
      return NextResponse.json({ error: "storage_error" }, { status: 500 });
    }
    throw err;
  }

  // 11 — Stored.
  return NextResponse.json({ ok: true });
}
