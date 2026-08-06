/* eslint-disable no-console */

/**
 * Usage:
 *   npx tsx scripts/validate-event.ts <slug>
 *
 * Runs the same runtime validation the Next.js loader runs when the site
 * renders an event: Zod parses meta, content, theme, and any enabled
 * section bundles, and cross-checks meta.slug against the registry key
 * plus enabledSections against the presence of matching section modules.
 *
 * Why a separate script (vs. relying on `tsc` or `next build`):
 *
 *   `tsc --noEmit` only checks TypeScript shapes. Every event file uses
 *   `satisfies z.input<typeof Schema>`, which matches the INPUT type —
 *   i.e. pre-parse, pre-validation. Rules like `.min(1)`, `.email()`,
 *   `.datetime({offset: true})`, enum membership, and slug-equals-key
 *   all run inside Zod parse at runtime, not in tsc. `next build`
 *   catches them but takes ~20s; this script runs in ~1s and is what
 *   the `create-event` skill calls before reporting success.
 *
 * Exit codes:
 *   0  event parses cleanly
 *   1  validation failure (diagnostic printed to stderr)
 *   2  misuse (missing slug, unknown slug)
 */

import { EventNotFoundError, loadEvent } from "@/events/registry";

function main(): void {
  const slug = process.argv[2];
  if (!slug) {
    console.error("usage: npx tsx scripts/validate-event.ts <slug>");
    process.exit(2);
  }

  try {
    const bundle = loadEvent(slug);
    const sections = bundle.meta.enabledSections.join(", ");
    console.log(
      `\u2713 ${slug} validates — status=${bundle.meta.status}, sections=[${sections}]`,
    );
  } catch (err) {
    if (err instanceof EventNotFoundError) {
      console.error(
        `\u2717 ${slug} is not in events/registry.ts. Did the import + REGISTRY entry get added?`,
      );
      process.exit(2);
    }
    console.error(`\u2717 ${slug} failed validation:`);
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
