import "server-only";

import { getSupabaseServer } from "../supabase";
import type {
  AuditAction,
  RsvpAuditInsert,
  RsvpInsert,
  RsvpRow,
} from "../supabase.types";
import type { RsvpIdentity, RsvpInput } from "../schemas/rsvp";

const RSVPS_TABLE = "rsvps";
const RSVP_AUDIT_TABLE = "rsvp_audit";

/**
 * Typed Supabase helpers for RSVP reads, upserts, token regeneration, and
 * audit-log writes. All calls go through the service-role client, so the
 * service alone is responsible for authorization — callers must verify the
 * token/slug first.
 *
 * Errors from Supabase are wrapped in StorageError with a stable code so
 * callers don't need to pattern-match on raw Postgres / PostgREST messages.
 */

export class StorageError extends Error {
  readonly code: "not_found" | "conflict" | "db_error";
  constructor(code: StorageError["code"], message: string) {
    super(message);
    this.name = "StorageError";
    this.code = code;
  }
}

// Postgres "unique_violation"
const UNIQUE_VIOLATION = "23505";

function toInsert(
  slug: string,
  identity: RsvpIdentity,
  input: RsvpInput,
): RsvpInsert {
  return {
    event_slug: slug,
    first_name: identity.firstName,
    last_name: identity.lastName,
    email: identity.email,
    attending: input.attending,
    plus_one: input.plusOne ?? false,
    plus_one_name: input.plusOneName ?? null,
    dietary: input.dietary && input.dietary.length > 0 ? input.dietary : null,
    dietary_other: input.dietaryOther ?? null,
    tshirt: input.tshirt ?? null,
    roommate: input.roommate ?? null,
    arrival_note: input.arrivalNote ?? null,
    emergency_contact: input.emergencyContact ?? null,
  };
}

/**
 * Upsert an RSVP keyed by (event_slug, lower(email)). Returns the
 * persisted row for audit logging and downstream email rendering.
 *
 * The historical edit-token columns (token_version, token_expires_at)
 * were retired in migration 0003 — the app no longer emits or verifies
 * tokens, since full-site magic-link auth gates all edit flows.
 */
export async function upsertRsvp(
  slug: string,
  identity: RsvpIdentity,
  input: RsvpInput,
): Promise<RsvpRow> {
  const supabase = getSupabaseServer();
  const existing = await getRsvpByEmail(slug, identity.email);

  if (!existing) {
    const insert = toInsert(slug, identity, input);
    const { data, error } = await supabase
      .from(RSVPS_TABLE)
      .insert(insert as never)
      .select("*")
      .single();
    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        // Race: another submit slipped in between our read and write.
        // Retry once via the update path.
        const reread = await getRsvpByEmail(slug, identity.email);
        if (reread) return applyUpdate(reread, identity, input);
      }
      throw new StorageError("db_error", error.message);
    }
    const row = data as RsvpRow;
    await recordAudit({
      rsvp_id: row.id,
      event_slug: slug,
      action: "create",
      before: null,
      after: row as unknown as Record<string, unknown>,
    });
    return row;
  }

  return applyUpdate(existing, identity, input);
}

async function applyUpdate(
  existing: RsvpRow,
  identity: RsvpIdentity,
  input: RsvpInput,
): Promise<RsvpRow> {
  const supabase = getSupabaseServer();
  const patch = toInsert(existing.event_slug, identity, input);
  const { data, error } = await supabase
    .from(RSVPS_TABLE)
    .update(patch as never)
    .eq("id", existing.id)
    .select("*")
    .single();
  if (error) throw new StorageError("db_error", error.message);
  const row = data as RsvpRow;
  await recordAudit({
    rsvp_id: row.id,
    event_slug: row.event_slug,
    action: "update",
    before: existing as unknown as Record<string, unknown>,
    after: row as unknown as Record<string, unknown>,
  });
  return row;
}

/**
 * Fetch an RSVP by (event_slug, lower(email)).
 *
 * Every write path normalises email to lowercase (RsvpInput does
 * `.toLowerCase()`, toInsert passes it through unchanged), so rows always
 * store lowercase. We normalise the lookup key here too as belt-and-
 * suspenders — a caller that forgets still gets a correct hit.
 *
 * Uses `.eq`, NOT `.ilike`: `ilike` treats `_` and `%` as SQL wildcards,
 * which are legal in local-parts of email addresses and would match the
 * wrong row. `.eq` on the already-normalised email is an exact byte
 * compare and aligns with the unique functional index on (event_slug,
 * lower(email)).
 */
export async function getRsvpByEmail(
  slug: string,
  email: string,
): Promise<RsvpRow | null> {
  const normalised = email.trim().toLowerCase();
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from(RSVPS_TABLE)
    .select("*")
    .eq("event_slug", slug)
    .eq("email", normalised)
    .maybeSingle();
  if (error) throw new StorageError("db_error", error.message);
  return (data as RsvpRow | null) ?? null;
}

/**
 * Fetch an RSVP by id, scoped to an event_slug as a defense-in-depth check
 * against a malicious id that belongs to another event's row.
 */
export async function getRsvpById(
  id: string,
  slug: string,
): Promise<RsvpRow | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from(RSVPS_TABLE)
    .select("*")
    .eq("id", id)
    .eq("event_slug", slug)
    .maybeSingle();
  if (error) throw new StorageError("db_error", error.message);
  return (data as RsvpRow | null) ?? null;
}

/**
 * Append to the audit log. Never throws — a failed audit write shouldn't
 * roll back an otherwise-successful RSVP write. We log the failure so it's
 * visible in server logs.
 */
export async function recordAudit(entry: {
  rsvp_id: string;
  event_slug: string;
  action: AuditAction;
  actor?: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}): Promise<void> {
  const supabase = getSupabaseServer();
  const row: RsvpAuditInsert = {
    rsvp_id: entry.rsvp_id,
    event_slug: entry.event_slug,
    action: entry.action,
    actor: entry.actor ?? null,
    before: entry.before,
    after: entry.after,
  };
  const { error } = await supabase.from(RSVP_AUDIT_TABLE).insert(row as never);
  if (error) {
    // eslint-disable-next-line no-console
    console.error(
      `[rsvp_audit] failed to write ${entry.action} for ${entry.rsvp_id}:`,
      error.message,
    );
  }
}

/**
 * List all RSVPs for an event, ordered by created_at asc. Used by the
 * internal roster view and CSV egress (M2-D).
 */
export async function listRsvpsForEvent(slug: string): Promise<RsvpRow[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from(RSVPS_TABLE)
    .select("*")
    .eq("event_slug", slug)
    .order("created_at", { ascending: true });
  if (error) throw new StorageError("db_error", error.message);
  return (data as RsvpRow[] | null) ?? [];
}

/**
 * Delete every rsvp for an event (M2-E retention purge).
 *
 * The FK rsvp_audit.rsvp_id -> rsvps.id is declared ON DELETE CASCADE,
 * so a single DELETE on rsvps atomically removes matching audit rows.
 * We count rsvp_audit rows in a separate SELECT BEFORE the delete to
 * report an accurate audit_deleted figure in retention_log. There's a
 * tiny concurrency window where new audit rows could be written
 * between the count and the cascade (e.g. a slow inflight RSVP
 * update); those would be counted-but-not-observed. Acceptable for an
 * evidence log — the rsvps_deleted count is exact and is what
 * matters for compliance.
 *
 * Idempotent: running on an event with no rsvps returns
 * { rsvpsDeleted: 0, auditDeletedEstimate: 0 } without error.
 */
export async function purgeRsvpsForEvent(
  slug: string,
): Promise<{ rsvpsDeleted: number; auditDeletedEstimate: number }> {
  const supabase = getSupabaseServer();

  const auditCountRes = await supabase
    .from(RSVP_AUDIT_TABLE)
    .select("*", { count: "exact", head: true })
    .eq("event_slug", slug);
  if (auditCountRes.error) {
    throw new StorageError("db_error", auditCountRes.error.message);
  }
  const auditDeletedEstimate = auditCountRes.count ?? 0;

  const { data, error } = await supabase
    .from(RSVPS_TABLE)
    .delete()
    .eq("event_slug", slug)
    .select("id");
  if (error) throw new StorageError("db_error", error.message);
  const rsvpsDeleted = data?.length ?? 0;

  return { rsvpsDeleted, auditDeletedEstimate };
}
