/**
 * Central environment-variable accessor.
 *
 * Every env var is read through a getter, never at module top-level. That
 * keeps `next build` and `tsc` green even when the live keys aren't set:
 * only the code paths that actually use a key fail, and they fail with a
 * clear single-line message naming the missing variable.
 *
 * This file does NOT include `import "server-only"` — some accessors
 * (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ASSETS_BUCKET) are safe
 * to read from the client. Server-only consumers (lib/supabase.ts,
 * lib/resend.ts) should import "server-only" themselves.
 */

export class MissingEnvError extends Error {
  readonly name = "MissingEnvError";
  readonly varName: string;
  constructor(varName: string, hint?: string) {
    super(
      `Missing required environment variable: ${varName}.` +
        (hint ? ` ${hint}` : "") +
        ` See .env.example.`,
    );
    this.varName = varName;
  }
}

export class InvalidEnvError extends Error {
  readonly name = "InvalidEnvError";
  readonly varName: string;
  constructor(varName: string, value: string, hint?: string) {
    super(
      `Invalid environment variable: ${varName}=${JSON.stringify(value)}.` +
        (hint ? ` ${hint}` : "") +
        ` See .env.example.`,
    );
    this.varName = varName;
  }
}

function required(name: string, hint?: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") throw new MissingEnvError(name, hint);
  return v;
}

function optional(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v : undefined;
}

function httpOrigin(name: string, value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new InvalidEnvError(
      name,
      value,
      "Set this to an absolute http(s) origin like https://events.example.com. Do not include a path.",
    );
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new InvalidEnvError(
      name,
      value,
      "Only http(s) URLs are supported.",
    );
  }
  return url.origin;
}

export const env = {
  supabase: {
    /** Project URL, e.g. https://xxx.supabase.co. Server-only. */
    url: () => required("SUPABASE_URL"),
    /** Service-role key; bypasses RLS. NEVER ship to the client. */
    serviceRoleKey: () =>
      required(
        "SUPABASE_SERVICE_ROLE_KEY",
        "Used by lib/supabase.ts server client.",
      ),
    /** Anon key. Currently unused (we write only via service role), but
        reserved for future client reads of non-sensitive data. */
    anonKey: () => optional("SUPABASE_ANON_KEY"),
    /** Public URL safe for the browser (lib/assets.ts asset resolution). */
    publicUrl: () => optional("NEXT_PUBLIC_SUPABASE_URL"),
    /** Public storage bucket for event assets. Defaults to "event-assets". */
    assetsBucket: () =>
      optional("NEXT_PUBLIC_SUPABASE_ASSETS_BUCKET") ?? "event-assets",
  },
  auth: {
    /** HMAC secret for signing magic-link tokens AND session cookies.
        Rotating this secret invalidates every outstanding session cookie
        across every event — it's the emergency "log everyone out" lever.
        Server-only, but also read by middleware (edge runtime) — must
        use process.env, no Node APIs.

        Historically we also had RSVP_TOKEN_SECRET for signing RSVP
        edit-link tokens; that secret and its token flow were retired
        in migration 0003 when full-site magic-link auth made the
        separate edit-token redundant. */
    tokenSecret: () =>
      required(
        "AUTH_TOKEN_SECRET",
        "A random 32+ byte secret. `openssl rand -hex 32` works.",
      ),
  },
  resend: {
    /** Resend API key. Server-only. */
    apiKey: () => required("RESEND_API_KEY"),
    /** Verified "from" address, e.g. events@yourdomain.com. */
    fromEmail: () => required("RESEND_FROM_EMAIL"),
  },
  upstash: {
    /** Upstash Redis REST endpoint, e.g. https://xxx.upstash.io. Optional:
        when both this and the token are unset, lib/rate-limit.ts falls
        back to an in-process store. That's fine for single-instance dev
        but does NOT share state across serverless instances — set both
        vars in any production deployment. */
    restUrl: () => optional("UPSTASH_REDIS_REST_URL"),
    /** Upstash Redis REST token. Companion to restUrl; see above. */
    restToken: () => optional("UPSTASH_REDIS_REST_TOKEN"),
  },
  cron: {
    /** Shared secret that Vercel Cron (and manual operators) pass in
        the Authorization: Bearer header when hitting /api/cron/*.
        Required in production. Generate with openssl rand -hex 32. */
    secret: () =>
      required(
        "CRON_SECRET",
        "A random 32+ byte secret used by Vercel Cron to authenticate the retention purge endpoint. `openssl rand -hex 32` works.",
      ),
  },
  feedback: {
    /** HMAC secret for deriving pseudonymous respondent tokens passed
        to the embedded Tally feedback form as a hidden field. Dedicated
        secret — deliberately NOT AUTH_TOKEN_SECRET — so rotating the
        auth secret (the "log everyone out" lever) never breaks the
        ability to match historical feedback tokens back to attendees.
        Server-only. */
    respondentSecret: () =>
      required(
        "FEEDBACK_RESPONDENT_SECRET",
        "A random 32+ byte secret. `openssl rand -hex 32` works.",
      ),
  },
  tally: {
    /** Signing secret from the Tally form's webhook settings, used to
        verify the HMAC on /api/webhooks/tally payloads. The webhook
        fails closed (500) when this is unset — Tally's retry schedule
        re-delivers once the secret lands. Staging and production use
        SEPARATE Tally forms with separate secrets (scopeSpecific in
        .vercel-env-policy.json).

        One secret per ENVIRONMENT, not per form: Tally secrets are
        configured per-webhook, so every event's form within an
        environment must be set to this same value. If per-form secrets
        are ever required, replace this with a formId→secret map and
        thread the form id into verifyTallySignature's caller.
        Server-only. */
    signingSecret: () =>
      required(
        "TALLY_SIGNING_SECRET",
        "Copy from the Tally form's webhook settings (Integrations → Webhooks).",
      ),
  },
  // env.internal.* was the Basic Auth shared-credential path for
  // /internal/* during the M3 overlap. Removed — /internal/* now
  // requires a session cookie whose invite row has role=organizer.
  // See lib/auth/guard.ts → authorizeOrganizerRequest.
  /** Origin of the deployment, used to build absolute links in emails.
      Falls back to VERCEL_URL during preview deploys. If the configured
      value accidentally includes a path, strip it so email links still point
      at root-level API routes such as /api/auth/verify. */
  publicSiteUrl: () => {
    const explicit = optional("NEXT_PUBLIC_SITE_URL");
    if (explicit) return httpOrigin("NEXT_PUBLIC_SITE_URL", explicit);
    const vercel = optional("VERCEL_URL");
    if (vercel) return httpOrigin("VERCEL_URL", `https://${vercel}`);
    throw new MissingEnvError(
      "NEXT_PUBLIC_SITE_URL",
      "Set to the deployed origin (https://...) so RSVP emails have correct links.",
    );
  },
};
