import { cookies } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";
import { authorizeEventRequest } from "@/lib/auth/guard";
import { loadEvent } from "@/lib/content";
import { respondentToken } from "@/lib/feedback/respondent";
import { swallowedError } from "@/lib/log";
import { shouldBypassDraftAuth } from "@/lib/preview";

/**
 * Feedback page: an auth-gated wrapper around an embedded Tally form.
 *
 * The transactional feedback email links HERE, never to tally.so —
 * the front door stays behind the same magic-link auth as the rest of
 * the site (middleware checks the session signature, and we re-run the
 * full invite guard below because the iframe URL embeds a per-attendee
 * respondent token that must never render for anonymous visitors).
 *
 * The iframe src is built server-side from an EXPLICIT allowlist of
 * query params: three Tally display flags plus two hidden fields
 * (event slug + pseudonymous respondent token — see
 * lib/feedback/respondent.ts). Nothing else is forwarded. We
 * deliberately do not load Tally's embed.js (no third-party JS in our
 * origin); the trade-off is a fixed iframe height instead of
 * auto-resize, tuned per event via feedback.iframeHeightPx.
 *
 * Submissions come back through /api/webhooks/tally, which resolves
 * the event from the payload's formId — the hidden fields here are
 * attribution hints, not trust inputs.
 */

export const dynamic = "force-dynamic";

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { meta, content, feedback } = loadEvent(slug);
  if (!meta.enabledSections.includes("feedback") || !feedback) notFound();

  const auth = await authorizeEventRequest(slug, await cookies());

  if (!auth.ok) {
    // Same policy as registration: draft content-preview visitors get a
    // notice, never the form — the iframe URL carries a respondent
    // token derived from a real session, which doesn't exist here.
    if (shouldBypassDraftAuth(meta)) {
      return <FeedbackPreviewNotice slug={slug} />;
    }
    if (auth.reason === "db_error") {
      swallowedError("feedback/auth-db", auth.error);
      return <FeedbackRetryNotice slug={slug} />;
    }
    if (auth.reason === "no_session") {
      redirect(`/login/${slug}?next=%2Fe%2F${slug}%2Ffeedback`);
    }
    redirect(`/login/${slug}?error=${auth.reason}`);
  }

  if (!feedback.isOpen) {
    return (
      <FeedbackClosedNotice
        slug={slug}
        outro={feedback.outro}
        supportEmail={content.contact?.supportEmail}
      />
    );
  }

  // Explicit allowlist — every param Tally receives is listed here.
  const qs = new URLSearchParams({
    alignLeft: "1",
    hideTitle: "1",
    transparentBackground: "1",
    event: slug,
    respondent: respondentToken(slug, auth.session.email),
  });
  const src = `https://tally.so/embed/${feedback.tallyFormId}?${qs.toString()}`;

  return (
    <div className="page-in container-read page-head page-end">
      <div className="kicker">Feedback</div>
      <h1 className="h1" style={{ marginTop: 10 }}>
        {feedback.heading ?? "Tell us how it went"}
      </h1>
      {feedback.intro && (
        <p className="lede" style={{ marginTop: 18 }}>
          {feedback.intro}
        </p>
      )}
      <div
        className="card card-lg"
        style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 24 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="icon-tile" style={{ width: 36, height: 36 }}>
            <Icon name="message" size={18} />
          </span>
          <h2 className="h4">Feedback form</h2>
        </div>
        <iframe
          src={src}
          title={`${content.brand.shortName} feedback form`}
          loading="lazy"
          referrerPolicy="no-referrer"
          style={{
            display: "block",
            width: "100%",
            height: feedback.iframeHeightPx,
            border: 0,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Shared layout for the states that render instead of the form:
 * centered icon, kicker, heading, short explanation, one action.
 */
function StateNotice({
  icon,
  kicker,
  title,
  children,
  action,
}: {
  icon: IconName;
  kicker: string;
  title: string;
  children: ReactNode;
  action: { href: string; label: string };
}) {
  return (
    <div
      className="page-in container-read page-head page-end"
      style={{ textAlign: "center" }}
    >
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <span className="icon-tile">
          <Icon name={icon} size={20} />
        </span>
        <div className="kicker" style={{ marginTop: 20 }}>
          {kicker}
        </div>
        <h1 className="h2" style={{ marginTop: 10 }}>
          {title}
        </h1>
        <p className="body" style={{ marginTop: 16, fontSize: 17, lineHeight: 1.6 }}>
          {children}
        </p>
        <div style={{ marginTop: 32 }}>
          <Link href={action.href} className="btn btn-primary">
            {action.label}
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Draft content-preview visitors have no session, so there's no
 * respondent token to embed — mirror of RegistrationPreviewNotice.
 */
function FeedbackPreviewNotice({ slug }: { slug: string }) {
  return (
    <StateNotice
      icon="lock"
      kicker="Preview mode"
      title="Feedback is hidden here."
      action={{ href: `/e/${slug}`, label: "Back to the event" }}
    >
      The feedback form is personalized per attendee, so it only renders
      with a real login. To test it, seed an invite and sign in via the
      normal magic-link flow.
    </StateNotice>
  );
}

/** Auth guard hit a database error — render a retry path, never the form. */
function FeedbackRetryNotice({ slug }: { slug: string }) {
  return (
    <StateNotice
      icon="alert"
      kicker="One moment"
      title="We couldn’t load your session."
      action={{ href: `/e/${slug}/feedback`, label: "Try again" }}
    >
      Something hiccuped on our side. Reload the page to try again — your
      feedback form will be right here.
    </StateNotice>
  );
}

/** The feedback window is closed (feedback.isOpen === false). */
function FeedbackClosedNotice({
  slug,
  outro,
  supportEmail,
}: {
  slug: string;
  outro?: string;
  supportEmail?: string;
}) {
  return (
    <StateNotice
      icon="check"
      kicker="Feedback"
      title="The feedback window has closed."
      action={{ href: `/e/${slug}`, label: "Back to the event" }}
    >
      {outro ??
        "Thanks to everyone who shared their thoughts — it genuinely shapes the next one."}
      {supportEmail && (
        <>
          {" "}
          Still want to reach us? Write to{" "}
          <a
            href={`mailto:${supportEmail}`}
            style={{ color: "var(--accent)", fontWeight: 500 }}
          >
            {supportEmail}
          </a>
          .
        </>
      )}
    </StateNotice>
  );
}
