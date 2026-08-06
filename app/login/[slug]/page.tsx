import { notFound } from "next/navigation";
import { loadEvent, EventNotFoundError } from "@/lib/content";
import { themeToRootCSS } from "@/lib/theme";
import { LoginView } from "./LoginView";

/**
 * Login page. Lives OUTSIDE /e/[slug]/ so the event layout's session
 * gate doesn't redirect-loop when the user lands here unauthenticated.
 *
 * The page renders the event's theme tokens (so first-time visitors
 * see branded login even before they log in) and a simple email form.
 * Actual auth work happens in /api/auth/login → email → /api/auth/verify.
 */

export const dynamic = "force-dynamic";

interface LoginPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const [{ slug }, { next, error }] = await Promise.all([params, searchParams]);
  let bundle;
  try {
    bundle = loadEvent(slug);
  } catch (err) {
    if (err instanceof EventNotFoundError) notFound();
    throw err;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeToRootCSS(bundle.theme) }} />
      <LoginView
        slug={slug}
        brand={bundle.content.brand.client}
        eventShortName={bundle.content.brand.shortName}
        eventTagline={bundle.content.brand.tagline}
        next={next}
        errorCode={error}
      />
    </>
  );
}
