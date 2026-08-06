import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * Script-safe Supabase admin client.
 *
 * Unlike lib/supabase.ts, this file intentionally does NOT import
 * "server-only" so it can be used from Node CLI entrypoints such as
 * scripts/seed-invites.ts. Keep browser/server-component code on
 * lib/supabase.ts so accidental client imports still fail loudly.
 */

let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(env.supabase.url(), env.supabase.serviceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: { schema: "public" },
  });
  return _client;
}
