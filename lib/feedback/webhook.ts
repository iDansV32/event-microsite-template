import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { listEventSlugs, loadEvent } from "@/lib/content";

/**
 * Verification + parsing helpers for /api/webhooks/tally. Kept apart
 * from the route handler so the signature scheme and payload schema —
 * the two pieces most likely to need adjustment against Tally's real
 * behavior — live in one reviewable file.
 */

/**
 * Tally docs: the header value is an HMAC-SHA256 of the webhook
 * payload, base64-encoded, keyed by the form's signing secret. Their
 * Node example signs `JSON.stringify(webhookPayload)`; we verify over
 * the RAW REQUEST BODY bytes instead, which is the same string when
 * nothing re-serializes in between and avoids the canonicalization
 * trap (key order / whitespace drift after a parse→stringify round
 * trip).
 *
 * ⚠ CONFIRM IN STAGING before production cutover: submit through the
 * real form and check the raw-body HMAC matches the live header. If it
 * doesn't, the fallback diagnosis is HMAC over
 * JSON.stringify(JSON.parse(raw)) — document whichever matches here.
 */
export const TALLY_SIGNATURE_HEADER = "tally-signature";

export function verifyTallySignature(
  rawBody: string,
  header: string | null,
  secret: string,
): boolean {
  if (!header) return false;
  const expected = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  // Length check first: timingSafeEqual throws on mismatched lengths,
  // and length is not a secret here (it's determined by the digest).
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Read the request body as a stream with a hard byte cap. Trusting
 * Content-Length is not enough — clients can omit it or lie — so the
 * route uses the header only as a fast precheck and this reader as the
 * real bound.
 */
export async function readBodyCapped(
  req: Request,
  maxBytes: number,
): Promise<{ ok: true; raw: string } | { ok: false }> {
  if (!req.body) return { ok: true, raw: "" };
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel().catch(() => {});
      return { ok: false };
    }
    chunks.push(value);
  }
  return { ok: true, raw: Buffer.concat(chunks).toString("utf8") };
}

/**
 * Minimal-lenient payload shape. Vendor webhook schemas drift; we
 * require only the fields the route actually branches on and pass
 * everything else through untouched — the full payload is stored as
 * jsonb regardless, so nothing is lost to a strict parser.
 */
const TallyField = z.looseObject({
  key: z.string(),
  label: z.string().nullish(),
  type: z.string().nullish(),
  value: z.unknown(),
});

export const TallyWebhookPayload = z.looseObject({
  eventId: z.string().optional(),
  eventType: z.string(),
  data: z.looseObject({
    formId: z.string(),
    submissionId: z.string(),
    createdAt: z.string().optional(),
    fields: z.array(TallyField).default([]),
  }),
});

export type TallyWebhookPayload = z.infer<typeof TallyWebhookPayload>;
export type TallyField = z.infer<typeof TallyField>;

/**
 * Resolve the event by the payload's formId — the one identifier a
 * respondent cannot tamper with (hidden fields travel via the iframe
 * URL; formId is fixed by which form was actually submitted). A null
 * here means a signed-valid submission for a form no registered event
 * claims: either setup drift (form created, event module not deployed)
 * or a stale/retired form.
 *
 * Linear scan over the registry is deliberate — single-digit event
 * count, build-time-static modules, no index to maintain.
 */
export function findSlugByFormId(formId: string): string | null {
  for (const slug of listEventSlugs()) {
    try {
      const bundle = loadEvent(slug);
      if (
        bundle.meta.enabledSections.includes("feedback") &&
        bundle.feedback?.tallyFormId === formId
      ) {
        return slug;
      }
    } catch {
      // Draft events failing validation can't have a live form pointed
      // at them; skip rather than letting one broken draft take down
      // webhook ingestion for every event.
    }
  }
  return null;
}

/** First string-valued field whose label matches (Tally hidden fields keep their configured name as the label). */
export function hiddenFieldValue(
  fields: TallyField[],
  label: string,
): string | null {
  for (const f of fields) {
    if (f.label === label && typeof f.value === "string" && f.value !== "") {
      return f.value;
    }
  }
  return null;
}
