import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { listPublishedSlugs, loadEvent } from "@/lib/content";
import { swallowedError } from "@/lib/log";
import {
  getRetentionThreshold,
  isRetentionExpired,
  recordRetentionLog,
} from "@/lib/retention";
import { purgeFeedbackForEvent } from "@/lib/feedback/storage";
import { purgeRsvpsForEvent } from "@/lib/rsvp/storage";

/**
 * GET /api/cron/purge-retention
 *
 * Scheduled daily via vercel.json's `crons` entry. Iterates every
 * published event, computes its retention threshold (event end +
 * policy days), and for each event whose threshold has passed:
 *
 *   1. DELETE FROM rsvps WHERE event_slug = <slug>
 *   2. rsvp_audit rows cascade-delete via FK
 *   3. INSERT an evidence row into retention_log
 *
 * The endpoint is idempotent: a second invocation right after the
 * first does nothing (no rsvps remain for the deleted event), but
 * also harmlessly re-inserts a zero-count log row. If an operator
 * actually wants to see "was there anything to purge" the response
 * JSON tells them per-event.
 *
 * Auth: Authorization: Bearer <CRON_SECRET>. Vercel Cron sends this
 * header automatically when configured via vercel.json. Manual
 * operators can curl the endpoint with the same secret.
 *
 * One event failing does NOT abort the rest of the run. Errors are
 * collected into the per-event response entry so an operator can see
 * exactly which event(s) need attention and retry just those.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PerEventResult {
  slug: string;
  deleted: number;
  auditDeleted: number;
  feedbackDeleted: number;
  threshold: string | null;
  skipped?: "no_threshold" | "not_yet_expired";
  error?: string;
  logError?: string;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  let expected: string;
  try {
    expected = `Bearer ${env.cron.secret()}`;
  } catch (err) {
    // Missing CRON_SECRET means the endpoint is unusable; 500 with a
    // hint so an operator sees what's wrong in the Vercel Cron log.
    swallowedError("cron/missing-secret", err);
    return NextResponse.json(
      { error: "misconfigured", reason: "CRON_SECRET not set" },
      { status: 500 },
    );
  }
  if (!auth || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const triggeredBy = req.nextUrl.searchParams.get("by") ?? "vercel-cron";
  const reason =
    req.nextUrl.searchParams.get("reason") === "manual"
      ? "manual"
      : "scheduled";

  const slugs = listPublishedSlugs();
  const results: PerEventResult[] = [];

  for (const slug of slugs) {
    const entry: PerEventResult = {
      slug,
      deleted: 0,
      auditDeleted: 0,
      feedbackDeleted: 0,
      threshold: null,
    };
    try {
      const bundle = loadEvent(slug);
      const threshold = getRetentionThreshold(bundle);
      entry.threshold = threshold;
      if (!threshold) {
        entry.skipped = "no_threshold";
        results.push(entry);
        continue;
      }
      if (!isRetentionExpired(bundle)) {
        entry.skipped = "not_yet_expired";
        results.push(entry);
        continue;
      }

      const { rsvpsDeleted, auditDeletedEstimate } =
        await purgeRsvpsForEvent(slug);
      entry.deleted = rsvpsDeleted;
      entry.auditDeleted = auditDeletedEstimate;

      // Feedback purge runs unconditionally — an event that never
      // enabled the section deletes zero rows. Also clears the
      // email-send ledger (it holds attendee emails).
      const { feedbackDeleted } = await purgeFeedbackForEvent(slug);
      entry.feedbackDeleted = feedbackDeleted;

      // Log evidence. A log failure is surfaced per-event but does NOT
      // roll back the delete — the deletion already happened and the
      // count is in this response body.
      try {
        await recordRetentionLog({
          event_slug: slug,
          threshold_iso: threshold,
          rsvps_deleted: rsvpsDeleted,
          audit_deleted: auditDeletedEstimate,
          feedback_deleted: feedbackDeleted,
          reason,
          triggered_by: triggeredBy,
        });
      } catch (logErr) {
        swallowedError("retention/log-write", logErr);
        entry.logError =
          logErr instanceof Error ? logErr.message : "unknown error";
      }
    } catch (err) {
      swallowedError("retention/purge-event", err);
      entry.error = err instanceof Error ? err.message : "unknown error";
    }
    results.push(entry);
  }

  const anyError = results.some((r) => r.error || r.logError);
  return NextResponse.json(
    {
      ok: !anyError,
      ranAt: new Date().toISOString(),
      reason,
      triggeredBy,
      results,
    },
    { status: anyError ? 207 : 200 },
  );
}
