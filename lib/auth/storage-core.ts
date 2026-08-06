import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InvitedAttendeeInsert,
  InvitedAttendeeRow,
} from "../supabase.types";
import { InviteStorageError } from "./storage-error";

const TABLE = "invited_attendees";
const UNIQUE_VIOLATION = "23505";

export async function getInviteWithClient(
  supabase: SupabaseClient,
  slug: string,
  email: string,
): Promise<InvitedAttendeeRow | null> {
  const normalised = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("event_slug", slug)
    .eq("email", normalised)
    .maybeSingle();
  if (error) throw new InviteStorageError("db_error", error.message);
  return (data as InvitedAttendeeRow | null) ?? null;
}

export async function getActiveInviteWithClient(
  supabase: SupabaseClient,
  slug: string,
  email: string,
): Promise<InvitedAttendeeRow | null> {
  const normalised = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("event_slug", slug)
    .eq("email", normalised)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw new InviteStorageError("db_error", error.message);
  return (data as InvitedAttendeeRow | null) ?? null;
}

export async function listInvitesForEventWithClient(
  supabase: SupabaseClient,
  slug: string,
  opts: { includeRevoked?: boolean } = {},
): Promise<InvitedAttendeeRow[]> {
  let q = supabase.from(TABLE).select("*").eq("event_slug", slug);
  if (!opts.includeRevoked) q = q.is("revoked_at", null);
  const { data, error } = await q.order("invited_at", { ascending: true });
  if (error) throw new InviteStorageError("db_error", error.message);
  return (data as InvitedAttendeeRow[] | null) ?? [];
}

export async function upsertInviteWithClient(
  supabase: SupabaseClient,
  row: Omit<InvitedAttendeeInsert, "email"> & { email: string },
): Promise<InvitedAttendeeRow> {
  const email = row.email.trim().toLowerCase();
  const existing = await getInviteWithClient(supabase, row.event_slug, email);

  if (existing) {
    const patch: InvitedAttendeeInsert = {
      event_slug: row.event_slug,
      email,
      first_name: row.first_name ?? null,
      last_name: row.last_name ?? null,
      role: row.role ?? "attendee",
    };
    const { data, error } = await supabase
      .from(TABLE)
      .update(patch as never)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new InviteStorageError("db_error", error.message);
    return data as InvitedAttendeeRow;
  }

  const insert: InvitedAttendeeInsert = {
    event_slug: row.event_slug,
    email,
    first_name: row.first_name ?? null,
    last_name: row.last_name ?? null,
    role: row.role ?? "attendee",
  };
  const { data, error } = await supabase
    .from(TABLE)
    .insert(insert as never)
    .select("*")
    .single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      const reread = await getInviteWithClient(supabase, row.event_slug, email);
      if (reread) {
        const { data: updated, error: updateError } = await supabase
          .from(TABLE)
          .update({
            first_name: row.first_name ?? null,
            last_name: row.last_name ?? null,
            role: row.role ?? "attendee",
          } as never)
          .eq("id", reread.id)
          .select("*")
          .single();
        if (updateError) {
          throw new InviteStorageError("db_error", updateError.message);
        }
        return updated as InvitedAttendeeRow;
      }
    }
    throw new InviteStorageError("db_error", error.message);
  }
  return data as InvitedAttendeeRow;
}
