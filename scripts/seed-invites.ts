/* eslint-disable no-console */

/**
 * Usage:
 *   npx tsx scripts/seed-invites.ts <event-slug>
 *
 * Reads events/<slug>/invites.ts, validates each entry against the
 * InviteSeedEntry schema, and upserts into the invited_attendees table.
 *
 * Idempotent. Re-running does NOT bump session_version, so seeding
 * doesn't log anyone out. To revoke an attendee, either remove them from
 * invites.ts and run a revoke step manually, or bump their row's
 * session_version from the Supabase dashboard.
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment.
 */

import { loadEnvConfig } from "@next/env";
import { InviteSeed, InviteSeedEntry } from "@/lib/schemas";
import { upsertInviteWithClient } from "@/lib/auth/storage-core";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

loadEnvConfig(process.cwd());

async function main() {
  const slug = process.argv[2];
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    console.error("Usage: tsx scripts/seed-invites.ts <event-slug>");
    process.exit(2);
  }

  let mod: { invites: unknown };
  try {
    mod = await import(`@/events/${slug}/invites`);
  } catch (err) {
    console.error(`Could not load events/${slug}/invites.ts:`, err);
    process.exit(1);
  }

  const parsed = InviteSeed.safeParse(mod.invites);
  if (!parsed.success) {
    console.error(`Invalid invites file:`, parsed.error.issues);
    process.exit(1);
  }

  console.log(`Seeding ${parsed.data.entries.length} invites for ${slug}...`);
  const supabase = getSupabaseAdmin();

  let successes = 0;
  let failures = 0;
  for (const raw of parsed.data.entries) {
    const entry = InviteSeedEntry.parse(raw); // re-run to apply defaults
    try {
      const row = await upsertInviteWithClient(supabase, {
        event_slug: slug,
        email: entry.email,
        first_name: entry.firstName ?? null,
        last_name: entry.lastName ?? null,
        role: entry.role,
      });
      successes++;
      console.log(`  \u2713 ${row.email}  (${row.role})`);
    } catch (err) {
      failures++;
      console.error(`  \u00d7 ${entry.email}:`, err);
    }
  }

  console.log(`\nDone. ${successes} succeeded, ${failures} failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
