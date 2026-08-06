import "server-only";

import { getSupabaseServer } from "../supabase";
import type {
  FeedbackEmailSendInsert,
  FeedbackResponseInsert,
} from "../supabase.types";

const FEEDBACK_RESPONSES_TABLE = "feedback_responses";
const FEEDBACK_EMAIL_SENDS_TABLE = "feedback_email_sends";
const RSVPS_TABLE = "rsvps";

/**
 * Typed Supabase helpers for the feedback tables (migration 0007). All
 * calls go through the service-role client; callers own authorization —
 * the webhook route verifies the Tally HMAC first, the send route runs
 * authorizeOrganizerRequest first.
 *
 * Same StorageError shape as lib/rsvp/storage.ts so route handlers map
 * failures to stable response codes without pattern-matching Postgres
 * messages.
 */

export class FeedbackStorageError extends Error {
  readonly code: "db_error";
  constructor(message: string) {
    super(message);
    this.name = "FeedbackStorageError";
    this.code = "db_error";
  }
}

// Postgres "unique_violation"
const UNIQUE_VIOLATION = "23505";

/**
 * Append one verified Tally submission. Returns { inserted: false } on
 * the unique-violation path — duplicate webhook delivery or a replayed
 * capture — which the route reports as a 200 no-op so Tally stops
 * retrying.
 */
export async function insertFeedbackResponse(
  insert: FeedbackResponseInsert,
): Promise<{ inserted: boolean }> {
  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from(FEEDBACK_RESPONSES_TABLE)
    .insert(insert as never);
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return { inserted: false };
    throw new FeedbackStorageError(error.message);
  }
  return { inserted: true };
}

/**
 * Delete all feedback data for an event: responses AND the email-send
 * ledger (both contain attendee-derived data; the ledger holds emails).
 * Called from the retention cron after the RSVP purge. Idempotent —
 * events without feedback delete zero rows.
 *
 * Returns the response count only; that's what lands in
 * retention_log.feedback_deleted (ledger rows are deleted in the same
 * call but not separately counted — see migration 0007 comment).
 */
export async function purgeFeedbackForEvent(
  slug: string,
): Promise<{ feedbackDeleted: number }> {
  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from(FEEDBACK_RESPONSES_TABLE)
    .delete()
    .eq("event_slug", slug)
    .select("id");
  if (error) throw new FeedbackStorageError(error.message);

  const { error: ledgerError } = await supabase
    .from(FEEDBACK_EMAIL_SENDS_TABLE)
    .delete()
    .eq("event_slug", slug);
  if (ledgerError) throw new FeedbackStorageError(ledgerError.message);

  return { feedbackDeleted: data?.length ?? 0 };
}

export interface FeedbackRecipient {
  email: string;
  firstName: string | null;
}

/**
 * Recipients for the feedback email: attendees who RSVP'd "yes" and are
 * NOT already in the send ledger. Deduping at the source is what makes
 * the send route repeat-call-safe after a timeout or partial failure.
 *
 * Two queries instead of a join: the service-role client has no FK
 * between the tables to lean on, and at event scale (tens to low
 * hundreds of rows) an in-memory set is simpler than a PostgREST
 * embedded filter.
 */
export async function listUnsentRecipients(
  slug: string,
): Promise<FeedbackRecipient[]> {
  const supabase = getSupabaseServer();

  const { data: rsvps, error: rsvpError } = await supabase
    .from(RSVPS_TABLE)
    .select("email, first_name")
    .eq("event_slug", slug)
    .eq("attending", "yes")
    .order("created_at", { ascending: true });
  if (rsvpError) throw new FeedbackStorageError(rsvpError.message);

  const { data: sends, error: sendsError } = await supabase
    .from(FEEDBACK_EMAIL_SENDS_TABLE)
    .select("email")
    .eq("event_slug", slug);
  if (sendsError) throw new FeedbackStorageError(sendsError.message);

  const alreadySent = new Set(
    (sends ?? []).map((s) => (s.email as string).trim().toLowerCase()),
  );

  return ((rsvps ?? []) as { email: string; first_name: string | null }[])
    .filter((r) => !alreadySent.has(r.email.trim().toLowerCase()))
    .map((r) => ({ email: r.email, firstName: r.first_name }));
}

/** Count of ledgered sends for an event (the "alreadySent" figure in dry-run output). */
export async function countLedgeredSends(slug: string): Promise<number> {
  const supabase = getSupabaseServer();
  const { count, error } = await supabase
    .from(FEEDBACK_EMAIL_SENDS_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("event_slug", slug);
  if (error) throw new FeedbackStorageError(error.message);
  return count ?? 0;
}

/**
 * Ledger one successful send. A unique-violation here means a
 * concurrent invocation already sent to this recipient — log-worthy
 * upstream but not an error worth failing the batch over, so it's
 * reported in the return value rather than thrown.
 */
export async function recordEmailSend(
  insert: FeedbackEmailSendInsert,
): Promise<{ recorded: boolean }> {
  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from(FEEDBACK_EMAIL_SENDS_TABLE)
    .insert(insert as never);
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return { recorded: false };
    throw new FeedbackStorageError(error.message);
  }
  return { recorded: true };
}
