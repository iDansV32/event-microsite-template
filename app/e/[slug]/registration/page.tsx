import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { authorizeEventRequest } from "@/lib/auth/guard";
import { loadEvent } from "@/lib/content";
import { formatMonthDay } from "@/lib/format";
import { swallowedError } from "@/lib/log";
import { shouldBypassDraftAuth } from "@/lib/preview";
import { getRsvpByEmail } from "@/lib/rsvp/storage";
import {
  RegistrationRetry,
  RegistrationView,
  type ExistingRsvp,
} from "./RegistrationView";

/**
 * Registration is a server component that runs only for authenticated
 * users (middleware enforces session signature + expiry on /e/*, the
 * event layout re-checks the invite via authorizeEventRequest). Here we
 * do the same guard call ourselves because we need the INVITE ROW too —
 * the authoritative source for the attendee's first/last name. The
 * client never supplies identity; the server builds it from invite +
 * session at write time.
 *
 * Failure modes:
 *
 *   no_session / no_invite / revoked / version_mismatch
 *     \u2192 redirect to /login/<slug>?error=<reason>. The layout would
 *     normally catch these first; this is defense-in-depth.
 *
 *   db_error
 *     \u2192 render a RegistrationRetry screen rather than silently
 *     degrading to blank identity (which is what caused placeholder
 *     "—" names to land in RSVP rows pre-fix). No form = no write.
 */

export const dynamic = "force-dynamic";

export default async function RegistrationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { content, meta } = loadEvent(slug);
  if (!meta.enabledSections.includes("registration")) notFound();

  const auth = await authorizeEventRequest(slug, await cookies());

  if (!auth.ok) {
    // Draft preview mode (`previewMode: "content"` only): unauthenticated
    // browsing of draft events is allowed for public pages, but the
    // registration form itself writes to Supabase on submit. We
    // deliberately do NOT fake a session here — render a clear notice
    // instead, so preview-mode visitors understand this is the one
    // page that requires the real auth flow. `previewMode: "auth"`
    // events skip this branch and fall through to the normal redirect-
    // to-login behavior, since the whole point of that mode is to
    // exercise the real auth path.
    if (shouldBypassDraftAuth(meta)) {
      return <RegistrationPreviewNotice slug={slug} />;
    }
    if (auth.reason === "db_error") {
      swallowedError("registration/auth-db", auth.error);
      return <RegistrationRetry slug={slug} />;
    }
    if (auth.reason === "no_session") {
      redirect(
        `/login/${slug}?next=%2Fe%2F${slug}%2Fregistration`,
      );
    }
    redirect(`/login/${slug}?error=${auth.reason}`);
  }

  let existing: ExistingRsvp | null = null;
  try {
    const row = await getRsvpByEmail(slug, auth.session.email);
    if (row) {
      existing = {
        attending: row.attending,
        plusOne: row.plus_one,
        plusOneName: row.plus_one_name ?? "",
        dietary: row.dietary ?? [],
        dietaryOther: row.dietary_other ?? "",
        tshirt: (row.tshirt ?? "") as ExistingRsvp["tshirt"],
        roommate: row.roommate ?? "",
        arrivalNote: row.arrival_note ?? "",
        emergencyContact: row.emergency_contact ?? "",
        updatedAt: row.updated_at,
      };
    }
  } catch (err) {
    // RSVP prefill is nice-to-have. If it fails, user can still submit
    // fresh. Never 500 the page over it.
    swallowedError("registration/existing-rsvp", err);
  }

  const closesDisplay = content.registration.closesISO
    ? formatMonthDay(content.registration.closesISO)
    : null;
  const cityShort = content.venue.cityShort ?? content.venue.city;

  return (
    <RegistrationView
      slug={slug}
      email={auth.session.email}
      firstName={auth.invite.first_name ?? ""}
      lastName={auth.invite.last_name ?? ""}
      existing={existing}
      registrationIsOpen={content.registration.isOpen}
      closesDisplay={closesDisplay}
      eventShortName={content.brand.shortName}
      cityShort={cityShort}
      slackChannel={content.contact?.slackChannel}
      datesDisplay={content.dates.display}
      venueName={content.venue.name}
      rates={content.rates}
      supportEmail={content.contact?.supportEmail}
      faqEnabled={meta.enabledSections.includes("faq")}
    />
  );
}

/**
 * Rendered in draft-preview mode when the visitor has no session. The
 * registration form writes to Supabase on submit, which requires real
 * auth — so preview mode's public-page bypass intentionally does NOT
 * extend here. This notice tells the CSL what's happening and points
 * at the docs for wiring up the real auth flow.
 */
function RegistrationPreviewNotice({ slug }: { slug: string }) {
  return (
    <div className="page-in">
      <PageHeader
        eyebrow="Preview mode"
        title="Registration is hidden here"
        lede={
          <>
            The registration form writes real attendee data, so it only
            runs with a real login. To test the full RSVP flow, set up
            Supabase + Resend per{" "}
            <code>docs/live-infra-setup.md</code>, seed an invite, and
            log in via the normal magic-link flow.
          </>
        }
      />
      <div className="container page-end">
        <div style={{ marginTop: 32 }}>
          <Link href={`/e/${slug}`} className="btn btn-primary">
            Back to the event
          </Link>
        </div>
      </div>
    </div>
  );
}
