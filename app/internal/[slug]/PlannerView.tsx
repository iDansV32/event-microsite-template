"use client";

import { useMemo, useState } from "react";
import { formatDateTime, formatNumericDate } from "@/lib/format";
import type {
  RosterData,
  RosterEntry,
  RosterStatus,
} from "@/lib/internal/storage";
import type { RetentionLogRow } from "@/lib/supabase.types";

/** Retention context passed from the server component — pure data,
    computed in page.tsx so the client component doesn't need lib/retention. */
export interface RetentionProps {
  label: string;
  thresholdISO: string | null;
  expired: boolean;
  lastPurge: RetentionLogRow | null;
}

/**
 * Planner / roster dashboard.
 *
 * Receives the full roster from the server as a prop. All filtering and
 * search runs in-memory client-side. No client-side fetches, no
 * localStorage. Refresh the browser to re-pull from Supabase.
 *
 * The roster prop is null when the server couldn't reach Supabase; the
 * view renders a clear "couldn't load" state with a retry link in that
 * case rather than pretending the roster is empty.
 */

const STATUS_LABEL: Record<RosterStatus, string> = {
  yes: "Confirmed",
  no: "Declined",
  pending: "Pending",
  revoked: "Revoked",
  orphan: "Orphan",
};

const STATUS_SWATCH: Record<RosterStatus, string> = {
  yes: "var(--teal)",
  no: "var(--danger)",
  pending: "var(--ink-40)",
  revoked: "var(--danger)",
  orphan: "var(--warn)",
};

type StatusFilter = "all" | RosterStatus;

export function PlannerView({
  slug,
  eventShortName,
  cityShort,
  roster,
  retention,
}: {
  slug: string;
  eventShortName: string;
  cityShort: string;
  roster: RosterData | null;
  retention: RetentionProps;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [copiedPending, setCopiedPending] = useState(false);

  const visible = useMemo(() => {
    if (!roster) return [];
    const q = query.trim().toLowerCase();
    return roster.entries.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${e.firstName ?? ""} ${e.lastName ?? ""} ${e.email} ${e.role ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [roster, query, statusFilter]);

  if (!roster) return <RosterUnavailable slug={slug} />;

  const { stats } = roster;

  async function copyPendingEmails() {
    if (!roster) return;
    const pending = roster.entries
      .filter((e) => e.status === "pending")
      .map((e) => e.email)
      .join(", ");
    try {
      await navigator.clipboard.writeText(pending);
      setCopiedPending(true);
      setTimeout(() => setCopiedPending(false), 2000);
    } catch {
      // Clipboard may be blocked (insecure context / permission). Fall
      // through — organizer can grab emails from the table below.
    }
  }

  return (
    <div className="page-in">
      <div className="container-ed" style={{ paddingTop: 56, paddingBottom: 96 }}>
        <div
          className="ed-flex items-end"
          style={{
            marginBottom: 48,
            flexWrap: "wrap",
            gap: 24,
            justifyContent: "space-between",
          }}
        >
          <div>
            <div className="eyebrow eyebrow-accent">Events team · internal</div>
            <h1
              className="display"
              style={{
                fontSize: "clamp(44px, 10vw, 72px)",
                marginTop: 12,
                lineHeight: 0.95,
              }}
            >
              The <em style={{ fontStyle: "italic" }}>planner.</em>
            </h1>
            <p
              className="serif"
              style={{
                fontSize: 18,
                color: "var(--ink-70)",
                fontStyle: "italic",
                marginTop: 16,
                maxWidth: 540,
                lineHeight: 1.55,
              }}
            >
              {eventShortName} · roster, RSVP progress, and dietary state,
              live from Supabase.
            </p>
          </div>
          <div className="ed-flex" style={{ gap: 8, flexWrap: "wrap" }}>
            <a
              href={`/api/internal/${slug}/export/csv`}
              className="btn btn-ghost btn-small"
              download
            >
              Export CSV
            </a>
            <a
              href={`/api/internal/${slug}/export/json`}
              className="btn btn-ghost btn-small"
              download
            >
              JSON
            </a>
            <button
              type="button"
              className="btn btn-primary btn-small"
              onClick={copyPendingEmails}
              disabled={stats.pending === 0}
              aria-live="polite"
            >
              {copiedPending
                ? "Copied \u2713"
                : `Copy ${stats.pending} pending email${stats.pending === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>

        <div className="ed-grid grid-4" style={{ gap: 16, marginBottom: 16 }}>
          <StatCard
            label="Active invites"
            value={stats.active}
            sub={
              stats.revoked > 0
                ? `${stats.organizers} organizer${stats.organizers === 1 ? "" : "s"} · ${stats.revoked} revoked`
                : `${stats.organizers} organizer${stats.organizers === 1 ? "" : "s"}`
            }
          />
          <StatCard
            label="Confirmed"
            value={stats.confirmed}
            sub={`${pct(stats.confirmed, stats.active)}% of active`}
            accent="var(--teal)"
          />
          <StatCard
            label="Declined"
            value={stats.declined}
            sub={`${pct(stats.declined, stats.active)}% of active`}
            accent="var(--danger)"
          />
          <StatCard
            label="Pending"
            value={stats.pending}
            sub={`${pct(stats.pending, stats.active)}% of active`}
          />
        </div>

        <div className="ed-grid grid-4" style={{ gap: 16, marginBottom: 40 }}>
          <StatCard
            label="Dietary flagged"
            value={stats.dietaryFlagged}
            sub="Needs or restrictions on file"
          />
          <StatCard
            label="Plus-ones"
            value={
              roster.entries.filter(
                (e) => e.plusOne && e.status !== "revoked",
              ).length
            }
            sub="Yes on the plus-one toggle"
          />
          <StatCard
            label="Orphan RSVPs"
            value={stats.orphans}
            sub="RSVPs without an invite row"
            accent={stats.orphans > 0 ? "var(--warn)" : undefined}
          />
          <StatCard
            label="Rooming preferences"
            value={
              roster.entries.filter(
                (e) =>
                  e.status !== "revoked" &&
                  (e.roommate ?? "").trim().length > 0,
              ).length
            }
            sub="Have a preferred roommate on file"
          />
        </div>

        <div
          className="ed-flex items-center"
          style={{ gap: 12, marginBottom: 20, flexWrap: "wrap" }}
        >
          <input
            type="search"
            className="input"
            placeholder="Search by name, email, or role"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ maxWidth: 360, flex: "1 1 240px" }}
            aria-label="Search the roster"
          />
          <div
            role="tablist"
            aria-label="Filter roster by status"
            className="ed-flex"
            style={{
              gap: 4,
              padding: 4,
              background: "var(--bg-deep)",
              borderRadius: 999,
            }}
          >
            {(
              [
                {
                  v: "all" as const,
                  label: "All",
                  count: stats.invited + stats.orphans,
                },
                { v: "pending" as const, label: "Pending", count: stats.pending },
                { v: "yes" as const, label: "Confirmed", count: stats.confirmed },
                { v: "no" as const, label: "Declined", count: stats.declined },
                { v: "revoked" as const, label: "Revoked", count: stats.revoked },
                { v: "orphan" as const, label: "Orphan", count: stats.orphans },
              ]
            ).map((o) => {
              const on = statusFilter === o.v;
              return (
                <button
                  key={o.v}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setStatusFilter(o.v)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 500,
                    background: on ? "var(--ink)" : "transparent",
                    color: on ? "var(--bg)" : "var(--ink-70)",
                    transition: "all 0.2s",
                  }}
                >
                  {o.label}
                  <span
                    style={{
                      opacity: 0.6,
                      marginLeft: 6,
                      fontFamily: "var(--f-mono)",
                      fontSize: 10,
                    }}
                  >
                    {o.count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-55)" }}>
            {visible.length} / {roster.entries.length} shown
          </div>
        </div>

        <RosterTable entries={visible} cityShort={cityShort} />

        <RetentionBanner retention={retention} />
      </div>
    </div>
  );
}

/**
 * Retention status banner shown below the roster. Three states:
 *
 *   - `lastPurge` present  -> event has already been purged. Show
 *     when + what was deleted. This event's rsvps are gone; the roster
 *     above is either empty or showing only invited_attendees rows.
 *
 *   - `expired` and no lastPurge -> retention window has elapsed but
 *     the cron hasn't run yet (typically <24h). Tell the organizer
 *     it's about to happen.
 *
 *   - otherwise -> window still open. Show the policy + computed
 *     threshold so organizers know when PII leaves the system.
 *
 * Kept compact and at the bottom of the planner because most of the
 * time the answer is "not yet" and organizers don't need it front of
 * mind. When it fires, it fires quietly.
 */
function RetentionBanner({ retention }: { retention: RetentionProps }) {
  const { label, thresholdISO, expired, lastPurge } = retention;

  let content: React.ReactNode;
  let accent: string;

  if (lastPurge) {
    accent = "var(--ink-55)";
    content = (
      <>
        <strong style={{ fontWeight: 500, color: "var(--ink)" }}>
          Purged
        </strong>
        {" "}
        on {formatDateTime(lastPurge.purged_at)} &middot;{" "}
        {lastPurge.rsvps_deleted} rsvp
        {lastPurge.rsvps_deleted === 1 ? "" : "s"} and{" "}
        {lastPurge.audit_deleted} audit row
        {lastPurge.audit_deleted === 1 ? "" : "s"} removed
        {lastPurge.triggered_by ? ` (${lastPurge.triggered_by})` : ""}.
      </>
    );
  } else if (expired) {
    accent = "var(--warn)";
    content = (
      <>
        <strong style={{ fontWeight: 500, color: "var(--ink)" }}>
          Retention window expired.
        </strong>
        {" "}
        The next scheduled cron run will purge this event&rsquo;s
        rsvps.
      </>
    );
  } else {
    accent = "var(--ink-55)";
    content = (
      <>
        <strong style={{ fontWeight: 500, color: "var(--ink)" }}>
          Retention policy:
        </strong>{" "}
        {label}
        {thresholdISO && (
          <>
            {" "}
            &middot; purges on or after{" "}
            <span className="mono">{formatNumericDate(thresholdISO)}</span>
          </>
        )}
        .
      </>
    );
  }

  return (
    <div
      role="note"
      aria-label="Retention status"
      style={{
        marginTop: 40,
        padding: "14px 20px",
        border: "1px solid var(--ink-12)",
        borderRadius: 12,
        background: "var(--paper)",
        fontSize: 13,
        color: accent,
        lineHeight: 1.55,
      }}
    >
      {content}
    </div>
  );
}

function RosterTable({
  entries,
  cityShort,
}: {
  entries: RosterEntry[];
  cityShort: string;
}) {
  if (entries.length === 0) {
    return (
      <div
        style={{
          padding: 48,
          border: "1px dashed var(--ink-12)",
          borderRadius: 16,
          textAlign: "center",
          color: "var(--ink-55)",
          fontSize: 14,
        }}
      >
        No attendees match these filters.
      </div>
    );
  }

  return (
    <div className="planner-table-scroll" style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 14,
        }}
      >
        <thead>
          <tr
            style={{
              textAlign: "left",
              color: "var(--ink-55)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              borderBottom: "1px solid var(--ink-12)",
            }}
          >
            <th style={{ padding: "14px 8px" }}>Name</th>
            <th style={{ padding: "14px 8px" }}>Email</th>
            <th style={{ padding: "14px 8px" }}>Role</th>
            <th style={{ padding: "14px 8px" }}>Status</th>
            <th style={{ padding: "14px 8px" }}>Plus-one</th>
            <th style={{ padding: "14px 8px" }}>Dietary</th>
            <th style={{ padding: "14px 8px" }}>T-shirt</th>
            <th style={{ padding: "14px 8px" }}>Submitted</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr
              key={e.email}
              style={{ borderBottom: "1px solid var(--ink-06)" }}
            >
              <td style={{ padding: "14px 8px" }}>
                {displayName(e) || <span style={{ color: "var(--ink-40)" }}>—</span>}
              </td>
              <td
                className="mono"
                style={{ padding: "14px 8px", fontSize: 12, color: "var(--ink-70)" }}
              >
                {e.email}
              </td>
              <td style={{ padding: "14px 8px" }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-55)" }}>
                  {e.role ?? "—"}
                </span>
              </td>
              <td style={{ padding: "14px 8px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    color: STATUS_SWATCH[e.status],
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: STATUS_SWATCH[e.status],
                    }}
                  />
                  {STATUS_LABEL[e.status]}
                </span>
              </td>
              <td style={{ padding: "14px 8px" }}>
                {e.plusOne ? (
                  <span style={{ fontSize: 12, color: "var(--ink-70)" }}>
                    {e.plusOneName || "yes"}
                  </span>
                ) : (
                  <span style={{ color: "var(--ink-40)" }}>—</span>
                )}
              </td>
              <td style={{ padding: "14px 8px", fontSize: 12, color: "var(--ink-70)" }}>
                {summariseDietary(e)}
              </td>
              <td style={{ padding: "14px 8px" }}>
                <span className="mono" style={{ fontSize: 11 }}>
                  {e.tshirt ?? "—"}
                </span>
              </td>
              <td style={{ padding: "14px 8px" }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-55)" }}>
                  {e.rsvpUpdatedAt
                    ? formatNumericDate(e.rsvpUpdatedAt)
                    : "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p
        style={{
          marginTop: 24,
          fontSize: 12,
          color: "var(--ink-55)",
          lineHeight: 1.55,
          fontStyle: "italic",
        }}
      >
        Roster is joined from invited_attendees and rsvps on a refresh. No
        live subscription yet — reload to see new submissions. Attending
        status is the authoritative field; dietary and roommate come from
        the latest RSVP revision. {cityShort} logistics flow from the
        same row.
      </p>
    </div>
  );
}

function displayName(e: RosterEntry): string {
  const first = e.firstName ?? "";
  const last = e.lastName ?? "";
  return `${first} ${last}`.trim();
}

function summariseDietary(e: RosterEntry): string {
  const tags = e.dietary ?? [];
  const other = (e.dietaryOther ?? "").trim();
  if (tags.length === 0 && !other) return "—";
  const summary = tags.join(", ");
  if (other) return summary ? `${summary} · ${other}` : other;
  return summary;
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        padding: 24,
        background: "var(--paper)",
        border: "1px solid var(--ink-12)",
        borderRadius: 14,
      }}
    >
      <div className="eyebrow" style={{ color: "var(--ink-55)" }}>
        {label}
      </div>
      <div
        className="display"
        style={{
          fontSize: 48,
          marginTop: 8,
          lineHeight: 1,
          color: accent ?? "var(--ink)",
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 12,
            color: "var(--ink-55)",
            marginTop: 6,
            lineHeight: 1.4,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function pct(a: number, b: number): number {
  return b ? Math.round((a / b) * 100) : 0;
}

function RosterUnavailable({ slug }: { slug: string }) {
  return (
    <div
      className="page-in"
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <div className="eyebrow eyebrow-accent">Planner unavailable</div>
        <h1
          className="display"
          style={{
            fontSize: 48,
            marginTop: 12,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          Couldn&rsquo;t load the roster.
        </h1>
        <p
          className="serif"
          style={{
            fontSize: 17,
            fontStyle: "italic",
            color: "var(--ink-70)",
            marginTop: 20,
            lineHeight: 1.6,
          }}
        >
          Supabase isn&rsquo;t reachable. Give it a few seconds and retry.
          If this persists, check the Supabase status page and your
          SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.
        </p>
        <div style={{ marginTop: 36 }}>
          <a
            href={`/internal/${slug}`}
            className="btn btn-primary"
            style={{ textDecoration: "none" }}
          >
            Retry
          </a>
        </div>
      </div>
    </div>
  );
}
