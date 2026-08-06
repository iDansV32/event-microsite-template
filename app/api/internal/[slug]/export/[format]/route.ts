import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { authorizeOrganizerRequest } from "@/lib/auth/guard";
import { loadEvent, EventNotFoundError } from "@/lib/content";
import { swallowedError } from "@/lib/log";
import { loadRoster, type RosterEntry } from "@/lib/internal/storage";

/**
 * GET /api/internal/[slug]/export/[format]
 *
 * Organizer-only roster egress. Middleware verifies the session cookie
 * is signed + unexpired. This handler re-checks against Supabase that
 * the caller's invite row is active AND their role is organizer — a
 * non-organizer session is never allowed to download PII.
 *
 * Supported formats: csv | tsv | json.
 *   csv/tsv: one row per attendee, identity + RSVP state. RFC 4180 CSV
 *            with CRLF line endings. TSV same columns, tab-separated,
 *            tabs/newlines in values rejected (shouldn't appear in
 *            practice).
 *   json:    pretty-printed array of RosterEntry. Matches the Supabase
 *            shape loadRoster() returns.
 *
 * Returns Content-Disposition: attachment so the response downloads as
 * a file named after the event slug and format.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Format = "csv" | "tsv" | "json";

const MIME: Record<Format, string> = {
  csv: "text/csv; charset=utf-8",
  tsv: "text/tab-separated-values; charset=utf-8",
  json: "application/json; charset=utf-8",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; format: string }> },
) {
  const { slug, format: formatRaw } = await params;
  const format = formatRaw.toLowerCase();
  if (format !== "csv" && format !== "tsv" && format !== "json") {
    return NextResponse.json(
      { error: "unsupported_format", supported: ["csv", "tsv", "json"] },
      { status: 400 },
    );
  }
  const fmt = format as Format;

  try {
    loadEvent(slug);
  } catch (err) {
    if (err instanceof EventNotFoundError) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw err;
  }

  // Organizer-role guard. Middleware handled signature + expiry; this
  // ensures the session belongs to an organizer of THIS event with an
  // active invite row, and the DB isn't silently returning stale
  // versions.
  const auth = await authorizeOrganizerRequest(slug, req.cookies);
  if (!auth.ok) {
    if (auth.reason === "db_error") {
      swallowedError("internal/export-auth-db", auth.error);
      return NextResponse.json({ error: "storage_error" }, { status: 500 });
    }
    if (auth.reason === "not_organizer") {
      return NextResponse.json(
        { error: "forbidden", reason: "not_organizer" },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: "unauthenticated", reason: auth.reason },
      { status: 401 },
    );
  }

  let roster;
  try {
    roster = await loadRoster(slug);
  } catch (err) {
    swallowedError("internal/export", err);
    return NextResponse.json({ error: "storage_error" }, { status: 500 });
  }

  const body =
    fmt === "json"
      ? JSON.stringify(roster, null, 2)
      : serialiseDelimited(roster.entries, fmt);

  const filename = `${slug}-roster.${fmt}`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": MIME[fmt],
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

const COLUMNS: { key: keyof RosterEntry | "_name" | "_dietaryCombined"; header: string }[] = [
  { key: "_name", header: "Name" },
  { key: "email", header: "Email" },
  { key: "role", header: "Role" },
  { key: "status", header: "Status" },
  { key: "plusOne", header: "Plus one" },
  { key: "plusOneName", header: "Plus one name" },
  { key: "_dietaryCombined", header: "Dietary" },
  { key: "tshirt", header: "T-shirt" },
  { key: "roommate", header: "Roommate preference" },
  { key: "arrivalNote", header: "Arrival note" },
  { key: "emergencyContact", header: "Emergency contact" },
  { key: "invitedAt", header: "Invited at" },
  { key: "rsvpCreatedAt", header: "RSVP created at" },
  { key: "rsvpUpdatedAt", header: "RSVP updated at" },
  { key: "revokedAt", header: "Revoked at" },
];

function serialiseDelimited(entries: RosterEntry[], fmt: "csv" | "tsv"): string {
  const sep = fmt === "csv" ? "," : "\t";
  const lines: string[] = [];
  lines.push(COLUMNS.map((c) => escape(c.header, fmt)).join(sep));
  for (const e of entries) {
    const row = COLUMNS.map((c) => escape(cellValue(e, c.key), fmt));
    lines.push(row.join(sep));
  }
  // RFC 4180 prefers CRLF; many tools tolerate LF. Use CRLF for csv,
  // LF for tsv (Excel imports TSV with LF correctly; saves ~one byte
  // per row).
  const lineSep = fmt === "csv" ? "\r\n" : "\n";
  return lines.join(lineSep);
}

function cellValue(
  e: RosterEntry,
  key: (typeof COLUMNS)[number]["key"],
): string {
  if (key === "_name") {
    const n = `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim();
    return n;
  }
  if (key === "_dietaryCombined") {
    const tags = e.dietary ?? [];
    const other = (e.dietaryOther ?? "").trim();
    if (tags.length === 0 && !other) return "";
    if (other && tags.length > 0) return `${tags.join(", ")} | ${other}`;
    if (other) return other;
    return tags.join(", ");
  }
  const raw = e[key];
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "boolean") return raw ? "yes" : "no";
  if (Array.isArray(raw)) return raw.join(", ");
  return String(raw);
}

function escape(value: string, fmt: "csv" | "tsv"): string {
  if (fmt === "tsv") {
    // Tabs and newlines in values break TSV. We don't expect them in
    // names/emails/dietary strings but guard anyway by replacing with
    // space. This is lossy but only triggers on anomalous data.
    return value.replace(/[\t\r\n]+/g, " ");
  }
  // RFC 4180: quote if value contains comma, quote, or CR/LF. Double
  // any embedded quotes.
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
