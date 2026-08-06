/* eslint-disable no-console */

/**
 * Usage:
 *   npx tsx scripts/compute-event-iso.ts <YYYY-MM-DDTHH:mm:ss> <IANA-timezone>
 *
 * Example:
 *   npx tsx scripts/compute-event-iso.ts 2027-02-10T15:00:00 Europe/Madrid
 *   -> 2027-02-10T15:00:00+01:00
 *
 * Given an intended LOCAL wall-clock time in a named IANA timezone,
 * compute the ISO-8601 string with the correct UTC offset for that
 * specific instant. Handles Daylight Saving Time transitions
 * correctly — the offset is resolved against the ACTUAL UTC instant
 * the event occurs at, not against a naive UTC interpretation of the
 * wall clock (which is the DST-buggy shortcut the create-event skill
 * used to recommend).
 *
 * Why a script instead of inlining in SKILL.md:
 *
 *   The naive recipe "format the wall clock as UTC, then format in
 *   the target zone, then splice the offset onto the wall clock" can
 *   produce wrong offsets around DST boundaries. Getting this right
 *   requires iterating: guess the offset, compute the actual UTC
 *   instant, re-check the offset at that instant, repeat if DST
 *   moved under us. That's too much logic to trust to a markdown
 *   instruction; a tested script is simpler and correct.
 *
 * Algorithm:
 *
 *   1. Interpret the wall-clock parts as if they were UTC (call this
 *      pseudoUTC). This is NOT the right instant, but it's a starting
 *      anchor.
 *   2. Compute the offset that the target zone has AT pseudoUTC.
 *   3. The actual UTC instant I' that corresponds to the desired
 *      local wall clock is pseudoUTC - offset(pseudoUTC).
 *   4. Compute the offset the target zone has AT I'. If it matches
 *      step 2, we're done. If not, DST transitioned between the two
 *      instants — use the I' offset and re-derive I'. One more
 *      iteration always converges in practice.
 *   5. Ambiguous/nonexistent local times (the one-hour window that
 *      fall-back repeats and the one-hour window that spring-forward
 *      skips) produce an output anyway; the algorithm picks ONE valid
 *      interpretation and proceeds. Those cases are rare in offsite
 *      scheduling (events don't typically start at 2:30am) and the
 *      CSL confirmation in the skill is the final guardrail.
 *
 * Exit codes:
 *   0  success, ISO string printed to stdout (one line, no newline)
 *   2  misuse (bad args, unparseable wall clock, unknown timezone)
 */

const WALL_CLOCK_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;

function offsetMinutesAt(instantMs: number, tz: string): number {
  // Formats the given UTC instant as wall-clock time in `tz`, then
  // treats those wall-clock parts as UTC and takes the difference.
  // That difference IS the offset the zone has at that instant.
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(new Date(instantMs));
  const lookup: Record<string, string> = {};
  for (const p of parts) lookup[p.type] = p.value;
  // Intl uses "24" for midnight in some locales; normalise.
  const hour = lookup.hour === "24" ? "00" : lookup.hour;
  const asIfUTC = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(hour),
    Number(lookup.minute),
    Number(lookup.second),
  );
  return Math.round((asIfUTC - instantMs) / 60000);
}

function formatOffset(totalMinutes: number): string {
  const sign = totalMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(totalMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

function main(): void {
  const wallClock = process.argv[2];
  const timeZone = process.argv[3];
  if (!wallClock || !timeZone) {
    console.error(
      "usage: tsx scripts/compute-event-iso.ts <YYYY-MM-DDTHH:mm:ss> <IANA-timezone>",
    );
    process.exit(2);
  }

  const m = WALL_CLOCK_RE.exec(wallClock);
  if (!m) {
    console.error(
      `expected wall-clock in YYYY-MM-DDTHH:mm:ss form, got: ${wallClock}`,
    );
    process.exit(2);
  }

  // Validate timezone by attempting to construct a formatter with it.
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
  } catch {
    console.error(`unknown IANA timezone: ${timeZone}`);
    process.exit(2);
  }

  const pseudoUTC = Date.UTC(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    Number(m[6]),
  );

  // First guess: offset at the pseudo-UTC anchor.
  const firstGuess = offsetMinutesAt(pseudoUTC, timeZone);
  // Compute the implied actual UTC instant.
  let actualUTC = pseudoUTC - firstGuess * 60000;
  // Re-check offset at that instant — this is where DST gets corrected.
  const secondGuess = offsetMinutesAt(actualUTC, timeZone);
  if (secondGuess !== firstGuess) {
    // Offset shifted under us (DST boundary). Re-derive the actual UTC
    // instant using the corrected offset.
    actualUTC = pseudoUTC - secondGuess * 60000;
  }
  const finalOffset = offsetMinutesAt(actualUTC, timeZone);

  process.stdout.write(`${wallClock}${formatOffset(finalOffset)}`);
}

main();
