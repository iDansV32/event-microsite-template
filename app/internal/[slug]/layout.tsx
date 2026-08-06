import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SessionBadge, SignOutButton } from "@/components/auth/SignOut";
import { authorizeOrganizerRequest } from "@/lib/auth/guard";
import { loadEvent, EventNotFoundError } from "@/lib/content";
import { swallowedError } from "@/lib/log";
import { themeToRootCSS } from "@/lib/theme";

/**
 * Gate every /internal/[slug]/* page on organizer role.
 *
 * Middleware has already verified the session cookie's signature and
 * expiry. Here we re-check against Supabase: invite row must exist, not
 * be revoked, session_version must still match, AND role must be
 * organizer. Everything that isn't a "not_organizer" reason redirects
 * to /login/<slug> so the user can re-auth. Non-organizers who happen
 * to land on an /internal URL see an inline Forbidden screen with a
 * link back to the attendee overview — 404 would be less leaky but
 * also more confusing for real users who just clicked a shared link.
 *
 * db_error FAILS CLOSED. An attendee with a valid signed cookie must
 * NOT be allowed to render the planner during a Supabase blip — the
 * children below do their own roster reads and might succeed on a
 * partial outage, exposing the full attendee PII list to someone who
 * isn't an organizer. Instead we render an inline "temporarily
 * unavailable" screen and stop. This mirrors the attendee-side
 * registration page, which also surfaces a retry screen on db_error.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default async function InternalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let theme;
  try {
    theme = loadEvent(slug).theme;
  } catch (err) {
    if (err instanceof EventNotFoundError) notFound();
    throw err;
  }

  const auth = await authorizeOrganizerRequest(slug, await cookies());

  if (!auth.ok) {
    if (auth.reason === "db_error") {
      swallowedError("internal/auth-db", auth.error);
      return (
        <>
          <style
            dangerouslySetInnerHTML={{ __html: themeToRootCSS(theme) }}
          />
          <TemporarilyUnavailable slug={slug} />
        </>
      );
    } else if (auth.reason === "not_organizer") {
      return (
        <>
          <style
            dangerouslySetInnerHTML={{ __html: themeToRootCSS(theme) }}
          />
          <Forbidden slug={slug} />
        </>
      );
    } else if (auth.reason === "no_session") {
      redirect(`/login/${slug}?next=%2Finternal%2F${slug}`);
    } else {
      redirect(`/login/${slug}?error=${auth.reason}`);
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeToRootCSS(theme) }} />
      <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
        {/* Floating session badge. Absolute-positioned so it doesn't
            intrude on PlannerView's existing layout. At this point
            auth.ok is true (every !ok branch above returned / redirected),
            so auth.session.email is the verified organizer email —
            worth showing prominently because the live-ops footgun was
            "attendee cookie made exports look broken" (visible
            identity = faster resolution). */}
        {auth.ok && (
          <div
            style={{
              position: "absolute",
              top: 20,
              right: 24,
              zIndex: 50,
            }}
          >
            <SessionBadge slug={slug} email={auth.session.email} />
          </div>
        )}
        {children}
      </div>
    </>
  );
}

function Forbidden({ slug }: { slug: string }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "48px 24px",
        background: "var(--bg)",
      }}
    >
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <div className="eyebrow eyebrow-accent">Organizers only</div>
        <h1
          className="display"
          style={{
            fontSize: "clamp(40px, 9vw, 56px)",
            marginTop: 12,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          You don&rsquo;t have access to this page.
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
          The planner surface is limited to event organizers. If you
          think you should have access, contact your organizer team.
          If you meant to sign in with a different account, you can
          switch below.
        </p>
        <div
          style={{
            marginTop: 36,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Link href={`/e/${slug}`} className="btn btn-primary">
            Back to the event
          </Link>
          <SignOutButton slug={slug} />
        </div>
      </div>
    </main>
  );
}

/**
 * Rendered when the organizer guard can't confirm the caller's role
 * because Supabase is unreachable or returned an error. We fail closed
 * on purpose: the middleware-verified cookie alone doesn't prove the
 * caller is still an organizer (they could have been revoked or had
 * their role downgraded), and showing the planner would leak attendee
 * PII to a non-organizer during a partial outage.
 */
function TemporarilyUnavailable({ slug }: { slug: string }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "48px 24px",
        background: "var(--bg)",
      }}
    >
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <div className="eyebrow eyebrow-accent">Planner temporarily unavailable</div>
        <h1
          className="display"
          style={{
            fontSize: "clamp(40px, 9vw, 56px)",
            marginTop: 12,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          We couldn&rsquo;t confirm your access.
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
          Our authorization check is momentarily unreachable. Refresh in
          a moment. If this persists, contact your organizer team &mdash;
          or sign in with a different account below.
        </p>
        <div
          style={{
            marginTop: 36,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Link href={`/e/${slug}`} className="btn btn-primary">
            Back to the event
          </Link>
          <SignOutButton slug={slug} />
        </div>
      </div>
    </main>
  );
}
