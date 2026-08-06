import "server-only";

import { getSupabaseServer } from "./supabase";
import type { EventBundle, Meta } from "./schemas";
import type {
  RetentionLogInsert,
  RetentionLogRow,
} from "./supabase.types";

/**
 * M2-E retention policy interpreter.
 *
 * Source of truth: `meta.retention.pii` on each event content file
 * (see lib/schemas/meta.ts). The enum has three values today; this
 * helper maps each to a number of days anchored to `content.dates.endISO`.
 *
 *   "30d"               -> event end + 30 days
 *   "90d"               -> event end + 90 days
 *   "until-event+30d"   -> event end + 30 days (alias of "30d")
 *
 * The "30d" and "until-event+30d" values collapse because both are
 * event-anchored. We preserve both spellings in the schema so an
 * existing content file doesn't need to change wording, but they
 * mean the same purge threshold.
 *
 * Retention is deliberately NOT rolling per-row (e.g. "delete any
 * rsvp older than 30 days"). That would delete rsvps for events
 * that haven't happened yet, which is the opposite of what you
 * want. Event-anchored retention matches the product model — the
 * event's end is the moment PII stops being operationally useful.
 */

export const RETENTION_DAYS: Record<Meta["retention"]["pii"], number> = {
  "30d": 30,
  "90d": 90,
  "until-event+30d": 30,
};

/**
 * Compute the absolute purge threshold for an event: rsvps for this
 * event become eligible for deletion once NOW >= this timestamp.
 *
 * Returns null when:
 *   - The event has no end date (shouldn't happen on published events;
 *     defensive).
 *   - The end date fails to parse (malformed content).
 */
export function getRetentionThreshold(bundle: EventBundle): string | null {
  const endISO = bundle.content.dates.endISO;
  const endMs = Date.parse(endISO);
  if (!Number.isFinite(endMs)) return null;
  const days = RETENTION_DAYS[bundle.meta.retention.pii];
  const thresholdMs = endMs + days * 86_400_000;
  return new Date(thresholdMs).toISOString();
}

/**
 * True when NOW is past the computed threshold, meaning it's time
 * to purge. False if retention can't be computed — fail closed;
 * absent policy should never trigger a deletion.
 */
export function isRetentionExpired(
  bundle: EventBundle,
  now: Date = new Date(),
): boolean {
  const threshold = getRetentionThreshold(bundle);
  if (!threshold) return false;
  return now.getTime() >= Date.parse(threshold);
}

/**
 * Human-readable days label for the UI ("90 days", "30 days").
 */
export function retentionLabel(bundle: EventBundle): string {
  const days = RETENTION_DAYS[bundle.meta.retention.pii];
  return `${days} days after event end`;
}

const RETENTION_LOG_TABLE = "retention_log";

/** Append an evidence row after a successful purge. Errors bubble up to
    the caller so the cron route can surface them in its response. */
export async function recordRetentionLog(
  row: RetentionLogInsert,
): Promise<void> {
  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from(RETENTION_LOG_TABLE)
    .insert(row as never);
  if (error) throw new Error(`retention_log insert failed: ${error.message}`);
}

/** Most recent purge for an event, or null. Used by the planner view. */
export async function getLatestRetentionLog(
  slug: string,
): Promise<RetentionLogRow | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from(RETENTION_LOG_TABLE)
    .select("*")
    .eq("event_slug", slug)
    .order("purged_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`retention_log read failed: ${error.message}`);
  return (data as RetentionLogRow | null) ?? null;
}
