import { notFound } from "next/navigation";
import { loadEvent, EventNotFoundError } from "@/lib/content";
import { swallowedError } from "@/lib/log";
import { loadRoster, type RosterData } from "@/lib/internal/storage";
import {
  getLatestRetentionLog,
  getRetentionThreshold,
  isRetentionExpired,
  retentionLabel,
} from "@/lib/retention";
import type { RetentionLogRow } from "@/lib/supabase.types";
import { PlannerView } from "./PlannerView";

/**
 * Internal planner / roster view.
 *
 * Authorization lives in the layout (app/internal/[slug]/layout.tsx),
 * which runs authorizeOrganizerRequest and fails closed on
 * not_organizer / db_error before this page ever renders. By the
 * time we're here, the caller has a valid session whose invite row
 * has role='organizer'.
 *
 * Data comes from loadRoster() which joins invited_attendees with
 * rsvps in-memory. A Supabase blip on the roster read degrades the
 * page to a clear "could not load roster" state rather than 500-ing
 * — organizers running a live event don't want a blank page during
 * a minor DB hiccup. (The auth-side db_error path is stricter and
 * fails closed; see layout.)
 */

export const dynamic = "force-dynamic";

export default async function PlannerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let eventShortName: string;
  let cityShort: string;
  let retentionProps: {
    label: string;
    thresholdISO: string | null;
    expired: boolean;
    lastPurge: RetentionLogRow | null;
  };
  try {
    const bundle = loadEvent(slug);
    eventShortName = bundle.content.brand.shortName;
    cityShort = bundle.content.venue.cityShort ?? bundle.content.venue.city;
    retentionProps = {
      label: retentionLabel(bundle),
      thresholdISO: getRetentionThreshold(bundle),
      expired: isRetentionExpired(bundle),
      lastPurge: null,
    };
  } catch (err) {
    if (err instanceof EventNotFoundError) notFound();
    throw err;
  }

  let roster: RosterData | null = null;
  try {
    roster = await loadRoster(slug);
  } catch (err) {
    swallowedError("internal/load-roster", err);
  }

  // Latest purge record is a nice-to-have; a Supabase blip shouldn't
  // take down the planner, so we degrade quietly to null.
  try {
    retentionProps.lastPurge = await getLatestRetentionLog(slug);
  } catch (err) {
    swallowedError("internal/retention-log", err);
  }

  return (
    <PlannerView
      slug={slug}
      eventShortName={eventShortName}
      cityShort={cityShort}
      roster={roster}
      retention={retentionProps}
    />
  );
}
