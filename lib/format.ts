const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/**
 * Format an ISO datetime as "Month Day" in the timezone embedded in the
 * string itself. We parse the calendar date portion directly rather than
 * going through a Date object, which keeps the output independent of the
 * runtime's local timezone (Vercel = UTC; dev = local; tests = whatever).
 */
export function formatMonthDay(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const month = Number(match[2]);
  const day = Number(match[3]);
  return `${MONTHS[month - 1]} ${day}`;
}

/** Day-of-month only (e.g. "1"), for big numeric date displays. */
export function formatDayNumber(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  return String(Number(match[3]));
}

/**
 * Format an ISO datetime as "DD/MM/YYYY" using only the calendar date
 * embedded in the string. This avoids locale-dependent server/client
 * rendering differences in hydrated React trees.
 */
export function formatNumericDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/**
 * Format an ISO datetime as "DD/MM/YYYY, HH:mm:ss" by extracting the
 * calendar date + wall-clock-time components directly from the string.
 * No Date object, no timezone conversion, no locale formatting — output
 * is identical on server and client so it's safe inside a hydrated
 * React tree.
 *
 * Note: the time shown is whatever was stored in the ISO string (UTC
 * for Supabase `timestamptz` columns). If you need the viewer's local
 * timezone, render it client-only after mount — mixing locale-dependent
 * formatters in SSR re-introduces the hydration mismatch this helper
 * exists to avoid.
 */
export function formatDateTime(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/.exec(iso);
  if (!match) return iso;
  const [, year, month, day, hour, minute, second] = match;
  return `${day}/${month}/${year}, ${hour}:${minute}:${second}`;
}
