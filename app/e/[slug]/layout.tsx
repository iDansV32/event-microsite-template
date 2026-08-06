import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PreviewBanner } from "@/components/PreviewBanner";
import {
  loadEvent,
  listPublishedSlugs,
  EventNotFoundError,
} from "@/lib/content";
import { authorizeEventRequest } from "@/lib/auth/guard";
import { swallowedError } from "@/lib/log";
import { isDraftPreviewEnabled, shouldBypassDraftAuth } from "@/lib/preview";
import { themeToRootCSS } from "@/lib/theme";
import type { EventBundle } from "@/lib/schemas";

export function generateStaticParams() {
  return listPublishedSlugs().map((slug) => ({ slug }));
}

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let bundle: EventBundle;
  try {
    bundle = loadEvent(slug);
  } catch (err) {
    if (err instanceof EventNotFoundError) notFound();
    throw err;
  }

  // Middleware has already verified the session signature + expiry. The
  // layout then re-checks the DB-backed invite row so revocation takes
  // effect immediately, not just on cookie expiry. A missing session here
  // means we're rendering for a child route that the matcher somehow
  // missed — we redirect to login to be safe. Returns the session email
  // when ok so the Nav can render a SessionBadge; undefined on degraded
  // db_error so we don't claim an identity we couldn't verify.
  //
  // Preview mode: split into two booleans so `previewMode: "auth"` events
  // can show the draft banner without skipping the auth call.
  //   - showPreviewBanner: any draft event on a preview deployment.
  //   - bypassAuth: subset of the above where previewMode is "content".
  const showPreviewBanner =
    isDraftPreviewEnabled() && bundle.meta.status === "draft";
  const bypassAuth = shouldBypassDraftAuth(bundle.meta);
  const signedInEmail = bypassAuth
    ? undefined
    : await enforceRevocation(slug);

  const { meta, content, theme } = bundle;

  return (
    <>
      {/* Scope the event theme to the whole document so HTML/BODY (page
          backdrop + dot pattern) also re-theme, not just the wrapper subtree.
          The <style> tag mounts/unmounts with this layout. */}
      <style dangerouslySetInnerHTML={{ __html: themeToRootCSS(theme) }} />
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg)",
        }}
      >
        {showPreviewBanner && <PreviewBanner authBypassed={bypassAuth} />}
        <Nav
          slug={slug}
          enabledSections={meta.enabledSections}
          brand={content.brand.client}
          shortName={content.brand.shortName}
          signedInEmail={signedInEmail}
        />
        <main style={{ flex: 1 }}>{children}</main>
        <Footer
          slug={slug}
          content={content}
          enabledSections={meta.enabledSections}
        />
      </div>
    </>
  );
}

async function enforceRevocation(slug: string): Promise<string | undefined> {
  // Middleware has already verified the session signature + expiry.
  // authorizeEventRequest re-checks against Supabase so revocation
  // (invite.revoked_at) and session_version bumps take effect
  // immediately, not just on cookie expiry. One invited_attendees
  // lookup per event-page render; fine at current scale, cacheable
  // if it ever gets hot.
  //
  // db_error is degraded (not 500'd) so a Supabase blip doesn't take
  // down the whole event page for a user whose middleware-verified
  // cookie was valid. Redirect() calls must stay OUTSIDE any try/catch
  // — Next implements them by throwing NEXT_REDIRECT which has to
  // propagate.
  const auth = await authorizeEventRequest(slug, await cookies());
  if (auth.ok) return auth.session.email;

  if (auth.reason === "db_error") {
    swallowedError("auth/revocation-check", auth.error);
    return undefined;
  }
  if (auth.reason === "no_session") redirect(`/login/${slug}`);
  redirect(`/login/${slug}?error=${auth.reason}`);
}
