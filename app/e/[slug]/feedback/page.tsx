import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
    <div className="page-in">
      <div
        className="container-read"
        style={{ paddingTop: 72, paddingBottom: 120 }}
      >
        <div className="eyebrow eyebrow-accent">
          {feedback.heading ?? "Tell us how it went"}
        </div>
        <h1
          className="display"
          style={{
            fontSize: "clamp(44px, 11vw, 84px)",
            marginTop: 16,
            letterSpacing: "-0.03em",
            lineHeight: 0.95,
          }}
        >
          Your <em style={{ fontStyle: "italic" }}>feedback.</em>
        </h1>
        {feedback.intro && (
          <p
            className="serif"
            style={{
              fontSize: 20,
              color: "var(--ink-70)",
              fontStyle: "italic",
              marginTop: 28,
              lineHeight: 1.55,
            }}
          >
            {feedback.intro}
          </p>
        )}
        <div style={{ marginTop: 48 }}>
          <iframe
            src={src}
            title={`${content.brand.shortName} feedback form`}
            loading="lazy"
            referrerPolicy="no-referrer"
            style={{
              width: "100%",
              height: feedback.iframeHeightPx,
              border: 0,
            }}
          />
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
    <main
      style={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <div className="eyebrow eyebrow-accent">Preview mode</div>
        <h1
          className="display"
          style={{
            fontSize: "clamp(32px, 6vw, 44px)",
            marginTop: 12,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          Feedback is hidden here.
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
          The feedback form is personalized per attendee, so it only
          renders with a real login. To test it, seed an invite and sign
          in via the normal magic-link flow.
        </p>
        <div style={{ marginTop: 32 }}>
          <Link href={`/e/${slug}`} className="btn btn-primary">
            Back to the event
          </Link>
        </div>
      </div>
    </main>
  );
}

/** Auth guard hit a database error — render a retry path, never the form. */
function FeedbackRetryNotice({ slug }: { slug: string }) {
  return (
    <main
      style={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <div className="eyebrow eyebrow-accent">One moment</div>
        <h1
          className="display"
          style={{
            fontSize: "clamp(32px, 6vw, 44px)",
            marginTop: 12,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          We couldn&rsquo;t load your session.
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
          Something hiccuped on our side. Reload the page to try again —
          your feedback form will be right here.
        </p>
        <div style={{ marginTop: 32 }}>
          <Link href={`/e/${slug}/feedback`} className="btn btn-primary">
            Try again
          </Link>
        </div>
      </div>
    </main>
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
    <main
      style={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <div className="eyebrow eyebrow-accent">Feedback</div>
        <h1
          className="display"
          style={{
            fontSize: "clamp(32px, 6vw, 44px)",
            marginTop: 12,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          The feedback window has closed.
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
          {outro ??
            "Thanks to everyone who shared their thoughts — it genuinely shapes the next one."}
          {supportEmail && (
            <>
              {" "}
              Still want to reach us? Write to{" "}
              <strong
                style={{ color: "var(--terracotta)", fontStyle: "normal" }}
              >
                {supportEmail}
              </strong>
              .
            </>
          )}
        </p>
        <div style={{ marginTop: 32 }}>
          <Link href={`/e/${slug}`} className="btn btn-primary">
            Back to the event
          </Link>
        </div>
      </div>
    </main>
  );
}
