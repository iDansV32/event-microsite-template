/**
 * Hand-rolled row shapes that match supabase/migrations/*.sql. Used by
 * lib/rsvp/storage.ts to type the helpers' return values.
 *
 * We intentionally don't export a full `Database` generic for the
 * Supabase client — v2's generic inference makes that brittle for
 * hand-rolled types. Once a real Supabase project exists, replace this
 * file with `npx supabase gen types typescript --project-id <id>` and
 * pass its `Database` into `createClient<Database>` in lib/supabase.ts.
 */

export type RsvpStatus = "yes" | "no";
/**
 * Audit action values that the app EMITS. The DB CHECK constraint on
 * rsvp_audit.action still permits the historical value 'token_regen'
 * so pre-migration-0003 rows remain valid, but no code path writes
 * that value any more.
 */
export type AuditAction = "create" | "update" | "purge";
export type InviteRole = "attendee" | "organizer" | "guest";

export interface InvitedAttendeeRow {
  id: string;
  event_slug: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: InviteRole;
  session_version: number;
  invited_at: string;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvitedAttendeeInsert {
  event_slug: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  role?: InviteRole;
  session_version?: number;
  invited_at?: string;
  revoked_at?: string | null;
}

export type InvitedAttendeeUpdate = Partial<InvitedAttendeeInsert>;

export interface RsvpRow {
  id: string;
  event_slug: string;
  first_name: string;
  last_name: string;
  email: string;
  attending: RsvpStatus;
  plus_one: boolean;
  plus_one_name: string | null;
  dietary: string[] | null;
  dietary_other: string | null;
  tshirt: string | null;
  roommate: string | null;
  arrival_note: string | null;
  emergency_contact: string | null;
  created_at: string;
  updated_at: string;
}

export interface RsvpInsert {
  event_slug: string;
  first_name: string;
  last_name: string;
  email: string;
  attending: RsvpStatus;
  plus_one?: boolean;
  plus_one_name?: string | null;
  dietary?: string[] | null;
  dietary_other?: string | null;
  tshirt?: string | null;
  roommate?: string | null;
  arrival_note?: string | null;
  emergency_contact?: string | null;
}

export type RsvpUpdate = Partial<RsvpInsert>;

export interface RsvpAuditRow {
  id: string;
  rsvp_id: string;
  event_slug: string;
  action: AuditAction;
  actor: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  at: string;
}

export interface RsvpAuditInsert {
  rsvp_id: string;
  event_slug: string;
  action: AuditAction;
  actor?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

export type RetentionReason = "scheduled" | "manual";

/**
 * Added in migration 0006. Distinguishes time-based cron purges from
 * operator-triggered manual cleanup of staging-stack data.
 */
export type RetentionOperation = "cron_purge" | "manual_cleanup";

/**
 * Added in migration 0006. Default 'production' for back-compat with
 * pre-0006 rows (which all came from the cron-purge path against the
 * production stack).
 */
export type RetentionEnvironment = "production" | "staging";

export interface RetentionLogRow {
  id: string;
  event_slug: string;
  purged_at: string;
  threshold_iso: string;
  rsvps_deleted: number;
  audit_deleted: number;
  reason: RetentionReason;
  triggered_by: string | null;
  /** Added in migration 0006. */
  environment: RetentionEnvironment;
  /** Added in migration 0006. */
  operation: RetentionOperation;
  /** Added in migration 0006. Cron purge writes 0; manual cleanup writes the actual count. */
  invited_attendees_deleted: number;
  /** Added in migration 0007. Rows removed from feedback_responses by this purge. */
  feedback_deleted: number;
}

export interface RetentionLogInsert {
  event_slug: string;
  threshold_iso: string;
  rsvps_deleted: number;
  audit_deleted: number;
  reason: RetentionReason;
  triggered_by?: string | null;
  /** Added in migration 0006. Defaults to 'production' at the DB layer. */
  environment?: RetentionEnvironment;
  /** Added in migration 0006. Defaults to 'cron_purge' at the DB layer. */
  operation?: RetentionOperation;
  /** Added in migration 0006. Defaults to 0 at the DB layer. */
  invited_attendees_deleted?: number;
  /** Added in migration 0007. Defaults to 0 at the DB layer. */
  feedback_deleted?: number;
}

// ─────────────────────────────────────────────────────────────────────
// invite_seed_audit (added in migration 0005)
//
// Append-only audit trail of staging-stack invite seeds that bypassed
// STAGING_EMAIL_ALLOWED_DOMAINS via explicit operator override. Written
// by the seed_event_invites MCP tool when an `overrides` entry is
// supplied. No app code path deletes from this table.
// ─────────────────────────────────────────────────────────────────────

/** v1: locked to 'staging'. Production-side override auditing is a separate decision. */
export type InviteSeedAuditEnvironment = "staging";

export interface InviteSeedAuditRow {
  id: string;
  event_slug: string;
  email: string;
  role: InviteRole;
  reason: string;
  overridden_by: string;
  overridden_at: string;
  environment: InviteSeedAuditEnvironment;
  ref: string | null;
  commit_sha: string | null;
}

export interface InviteSeedAuditInsert {
  event_slug: string;
  email: string;
  role: InviteRole;
  reason: string;
  overridden_by: string;
  environment: InviteSeedAuditEnvironment;
  ref?: string | null;
  commit_sha?: string | null;
}

// ─────────────────────────────────────────────────────────────────────
// feedback_responses + feedback_email_sends (added in migration 0007)
//
// Append-only mirror of Tally feedback submissions (written by
// /api/webhooks/tally after HMAC verification) and the send ledger for
// the feedback transactional email (written by
// /api/internal/<slug>/feedback-emails). Both purged by the retention
// cron alongside rsvps.
// ─────────────────────────────────────────────────────────────────────

export interface FeedbackResponseRow {
  id: string;
  event_slug: string;
  tally_form_id: string;
  tally_event_id: string;
  tally_submission_id: string;
  /** Respondent-tamperable attribution hint (see lib/feedback/respondent.ts). */
  respondent_token: string | null;
  /** Tally's data.createdAt, when present in the payload. */
  submitted_at: string | null;
  /** The entire verified webhook payload — source of truth over the typed columns. */
  payload: Record<string, unknown>;
  received_at: string;
}

export interface FeedbackResponseInsert {
  event_slug: string;
  tally_form_id: string;
  tally_event_id: string;
  tally_submission_id: string;
  respondent_token?: string | null;
  submitted_at?: string | null;
  payload: Record<string, unknown>;
}

export interface FeedbackEmailSendRow {
  id: string;
  event_slug: string;
  email: string;
  sent_at: string;
  /** Organizer session email that triggered the send. */
  sent_by: string;
}

export interface FeedbackEmailSendInsert {
  event_slug: string;
  email: string;
  sent_by: string;
}
