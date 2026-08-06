import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * Server-side Supabase client using the service role key.
 *
 * IMPORTANT — this client BYPASSES Row Level Security. It must only ever
 * be imported from code that runs on the server (server components, route
 * handlers, server actions, Edge Functions). The `import "server-only"`
 * at the top of this file turns accidental client-side usage into a build
 * error.
 *
 * Construction is lazy + memoised: calling getSupabaseServer() at module
 * import time (for example via `generateStaticParams`) would throw
 * MissingEnvError in environments without the keys. Instead, the client is
 * built on first call, so local builds and CI pass without live credentials
 * and only code paths that actually touch Supabase fail without them.
 *
 * The client is intentionally typed as `SupabaseClient` (untyped) rather
 * than `SupabaseClient<Database>`. Supabase v2's generic inference with a
 * hand-rolled Database type surfaces as hard-to-satisfy `never` constraints
 * on .insert()/.update() calls. Row-level typing is done in the storage
 * helpers (lib/rsvp/storage.ts) via typed return values instead. Once a
 * real project exists, `supabase gen types typescript` produces a Database
 * type that satisfies the generic — swap it in then.
 */

let _client: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient {
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
