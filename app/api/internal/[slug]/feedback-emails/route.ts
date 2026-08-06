import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { authorizeOrganizerRequest } from "@/lib/auth/guard";
import { loadEvent, EventNotFoundError } from "@/lib/content";
import { env, MissingEnvError } from "@/lib/env";
import {
  countLedgeredSends,
  listUnsentRecipients,
  recordEmailSend,
  FeedbackStorageError,
} from "@/lib/feedback/storage";
import { swallowedError } from "@/lib/log";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import {
  feedbackEmailSubject,
  sendFeedbackEmail,
  ResendError,
} from "@/lib/resend";
import { FeedbackEmailRequest } from "@/lib/schemas";

/**
 * POST /api/internal/[slug]/feedback-emails
 *
 * Organizer-triggered send of the "share your feedback" email to every
 * attendee who RSVP'd yes. This is the app's first mass-send surface,
 * so it's wrapped in three independent guards:
 *
 *   dry-run by default — the response lists who WOULD get mail (masked)
 *     plus the exact framed subject, and sends nothing. Live mode must
 *     be requested explicitly.
 *   confirm gate — mode:"live" additionally requires confirm to equal
 *     the event slug, so a copy-pasted request body can't fire against
 *     the wrong event.
 *   send ledger — every successful send is recorded in
 *     feedback_email_sends, and recipients are selected as
 *     "attending=yes AND not in ledger". Re-invoking after a timeout,
 *     crash, or partial failure skips everyone already mailed; the
 *     operator just re-POSTs until remaining is 0. The per-invocation
 *     cap (50) plus this loop is the timeout strategy — no single call
 *     needs to outlive the batch.
 *
 * Auth: middleware verifies the session cookie on /api/internal/*;
 * this handler re-checks the invite row is active and role=organizer,
 * same as the export route.
 *
 * Errors: 400 bad body / confirm mismatch · 401 unauthenticated ·
 * 403 not organizer · 404 unknown event or feedback not enabled ·
 * 409 feedback window closed · 429 rate limited · 500 storage/config.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const RATE_LIMIT = { limit: 3, windowMs: 60_000 };
const MAX_SENDS_PER_CALL = 50;
const DELAY_BETWEEN_SENDS_MS = 600; // Resend allows ~2 req/s

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const rl = await rateLimit(
    clientKey(req.headers, `feedback-email:${slug}`),
    RATE_LIMIT,
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterMs: rl.retryAfterMs },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
      },
    );
  }

  let bundle;
  try {
    bundle = loadEvent(slug);
  } catch (err) {
    if (err instanceof EventNotFoundError) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw err;
  }
  const { meta, content, feedback } = bundle;
  if (!meta.enabledSections.includes("feedback") || !feedback) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const auth = await authorizeOrganizerRequest(slug, req.cookies);
  if (!auth.ok) {
    if (auth.reason === "db_error") {
      swallowedError("internal/feedback-email-auth-db", auth.error);
      return NextResponse.json({ error: "storage_error" }, { status: 500 });
    }
    if (auth.reason === "not_organizer") {
      return NextResponse.json(
        { error: "forbidden", reason: "not_organizer" },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: "unauthenticated", reason: auth.reason },
      { status: 401 },
    );
  }

  let body: unknown = {};
  try {
    const raw = await req.text();
    if (raw.trim() !== "") body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "malformed_body" }, { status: 400 });
  }
  const parsed = FeedbackEmailRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }
  const { mode, confirm, limit } = parsed.data;

  // Never mail links to a closed page. Re-open feedback.isOpen first if
  // stragglers should get another nudge.
  if (!feedback.isOpen) {
    return NextResponse.json({ error: "feedback_closed" }, { status: 409 });
  }

  let recipients;
  let alreadySent: number;
  try {
    recipients = await listUnsentRecipients(slug);
    alreadySent = await countLedgeredSends(slug);
  } catch (err) {
    if (err instanceof FeedbackStorageError) {
      swallowedError("internal/feedback-email-recipients", err);
      return NextResponse.json({ error: "storage_error" }, { status: 500 });
    }
    throw err;
  }

  const framedSubject = feedbackEmailSubject(content.brand.shortName);

  if (mode === "dry-run") {
    return NextResponse.json({
      ok: true,
      mode: "dry-run",
      wouldSend: recipients.length,
      alreadySent,
      recipients: recipients.map((r) => maskEmail(r.email)),
      framedSubject,
    });
  }

  // mode === "live"
  if (confirm !== slug) {
    return NextResponse.json(
      {
        error: "confirm_mismatch",
        hint: "Set confirm to the event slug to send for real.",
      },
      { status: 400 },
    );
  }

  let feedbackUrl: string;
  try {
    feedbackUrl = `${env.publicSiteUrl()}/e/${slug}/feedback`;
  } catch (err) {
    if (err instanceof MissingEnvError) {
      swallowedError("internal/feedback-email-site-url", err);
      return NextResponse.json({ error: "site_url_missing" }, { status: 500 });
    }
    throw err;
  }

  const cap = Math.min(limit ?? MAX_SENDS_PER_CALL, MAX_SENDS_PER_CALL);
  const batch = recipients.slice(0, cap);
  let sent = 0;
  const failed: string[] = [];
  // Sends whose Resend call succeeded but whose ledger write failed.
  // Surfaced separately (and flips ok:false) because the failure mode
  // is the inverse of `failed`: the recipient GOT the email, but a
  // re-run would send it again.
  const ledgerFailed: string[] = [];

  for (let i = 0; i < batch.length; i++) {
    const recipient = batch[i];
    try {
      await sendFeedbackEmail({
        to: recipient.email,
        firstName: recipient.firstName ?? "",
        brandClient: content.brand.client,
        eventShortName: content.brand.shortName,
        feedbackUrl,
      });
      sent += 1;
      // Ledger immediately after each successful send so a crash
      // mid-batch never causes a re-send on the next invocation. A
      // ledger write failure is loud but doesn't undo the send.
      try {
        await recordEmailSend({
          event_slug: slug,
          email: recipient.email,
          sent_by: auth.session.email,
        });
      } catch (ledgerErr) {
        ledgerFailed.push(maskEmail(recipient.email));
        // eslint-disable-next-line no-console
        console.error(
          `[feedback-email] sent to ${maskEmail(recipient.email)} but ledger write failed — a re-run may re-send to this recipient`,
          ledgerErr instanceof Error ? ledgerErr.message : ledgerErr,
        );
      }
    } catch (err) {
      failed.push(maskEmail(recipient.email));
      if (err instanceof ResendError) {
        swallowedError("internal/feedback-email-send", err);
      } else {
        // eslint-disable-next-line no-console
        console.error("[feedback-email] unexpected send failure", err);
      }
    }
    if (i < batch.length - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, DELAY_BETWEEN_SENDS_MS),
      );
    }
  }

  return NextResponse.json({
    ok: failed.length === 0 && ledgerFailed.length === 0,
    mode: "live",
    sent,
    failed,
    ledgerFailed,
    remaining: recipients.length - batch.length + failed.length,
    framedSubject,
  });
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const head = local.slice(0, 1);
  const tail = local.length > 2 ? local.slice(-1) : "";
  return `${head}${"*".repeat(Math.max(1, local.length - 2))}${tail}@${domain}`;
}
