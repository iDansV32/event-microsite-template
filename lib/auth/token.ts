/**
 * Magic-link and session tokens for the invite-allowlist auth system.
 *
 * Runs in BOTH Node server routes AND the Edge middleware, so this file
 * uses WebCrypto (globalThis.crypto) exclusively. Do not reach for the
 * Node crypto module here — it's not available at the edge.
 *
 * Wire format (shared with RSVP tokens):
 *   base64url(JSON payload) + "." + base64url(HMAC-SHA256(secret, payload))
 *
 * Two payload types, discriminated by `type`:
 *
 *   magic    short-lived (15 min), issued when a matched invite requests
 *            a login link. Verified at /api/auth/verify, then exchanged
 *            for a session cookie. Carries an optional `next` for
 *            destination preservation.
 *
 *   session  long-lived (30d absolute, 7d sliding), issued after magic-
 *            link verification. Placed in a per-event cookie. Middleware
 *            checks it on every gated request.
 *
 * The `type` discriminator prevents a magic-link token from being
 * mistakenly accepted where a session cookie is expected, or vice versa.
 * The signature covers the type, so a token can't be re-typed.
 */

import { env } from "../env";

// ─── Public payload types ──────────────────────────────────────────────────

export interface MagicLinkPayload {
  type: "magic";
  email: string;
  slug: string;
  /** session_version from invited_attendees at issue time. Bumping the
      DB row's session_version invalidates any magic link that hadn't been
      exchanged yet. */
  version: number;
  /** Unix seconds. */
  exp: number;
  /** Optional redirect path after successful verify. Signed so it can't
      be tampered with. Validated as a safe in-site path on exchange. */
  next?: string;
}

export interface SessionPayload {
  type: "session";
  email: string;
  slug: string;
  role: "attendee" | "organizer" | "guest";
  version: number;
  /** Unix seconds. Issued-at. */
  iat: number;
  /** Unix seconds. Hard deadline; no sliding past this. */
  abs_exp: number;
  /** Unix seconds. Soft deadline; middleware extends when close. */
  sld_exp: number;
}

export type TokenPayload = MagicLinkPayload | SessionPayload;

export class AuthTokenError extends Error {
  readonly code:
    | "malformed"
    | "signature_mismatch"
    | "expired"
    | "slug_mismatch"
    | "version_mismatch"
    | "type_mismatch";
  constructor(code: AuthTokenError["code"], message: string) {
    super(message);
    this.name = "AuthTokenError";
    this.code = code;
  }
}

// ─── base64url helpers (no padding) ────────────────────────────────────────

function b64urlEncode(bytes: Uint8Array): string {
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const normalized = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(normalized);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ─── HMAC via WebCrypto (edge-safe) ────────────────────────────────────────

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret) as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(payloadBytes: Uint8Array): Promise<Uint8Array> {
  const key = await importKey(env.auth.tokenSecret());
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    payloadBytes as BufferSource,
  );
  return new Uint8Array(sig);
}

async function verify(
  payloadBytes: Uint8Array,
  sigBytes: Uint8Array,
): Promise<boolean> {
  const key = await importKey(env.auth.tokenSecret());
  return crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes as BufferSource,
    payloadBytes as BufferSource,
  );
}

// ─── Token sign / verify ───────────────────────────────────────────────────

export async function signToken(payload: TokenPayload): Promise<string> {
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const sig = await sign(payloadBytes);
  return `${b64urlEncode(payloadBytes)}.${b64urlEncode(sig)}`;
}

/**
 * Parse + verify a token. Returns the payload on success, throws
 * AuthTokenError with a stable code on any failure.
 *
 * `expectedType` guards against cross-use of magic vs session tokens.
 * `guards` lets the caller assert slug/version in one place.
 */
export async function verifyToken<T extends TokenPayload["type"]>(
  token: string,
  expectedType: T,
  guards?: { slug?: string; version?: number },
): Promise<Extract<TokenPayload, { type: T }>> {
  const parts = token.split(".");
  if (parts.length !== 2) {
    throw new AuthTokenError("malformed", "Token shape is invalid.");
  }
  const [payloadB64, sigB64] = parts;

  let payloadBytes: Uint8Array;
  let sigBytes: Uint8Array;
  try {
    payloadBytes = b64urlDecode(payloadB64);
    sigBytes = b64urlDecode(sigB64);
  } catch {
    throw new AuthTokenError("malformed", "Token is not valid base64url.");
  }

  const ok = await verify(payloadBytes, sigBytes);
  if (!ok) {
    throw new AuthTokenError("signature_mismatch", "Token signature does not match.");
  }

  let parsed: TokenPayload;
  try {
    parsed = JSON.parse(new TextDecoder().decode(payloadBytes)) as TokenPayload;
  } catch {
    throw new AuthTokenError("malformed", "Token payload is not valid JSON.");
  }

  if (parsed.type !== expectedType) {
    throw new AuthTokenError(
      "type_mismatch",
      `Expected ${expectedType} token, got ${parsed.type}.`,
    );
  }

  // Shape + expiry checks per type.
  if (parsed.type === "magic") {
    if (
      typeof parsed.email !== "string" ||
      typeof parsed.slug !== "string" ||
      typeof parsed.version !== "number" ||
      typeof parsed.exp !== "number"
    ) {
      throw new AuthTokenError("malformed", "Magic token payload is missing fields.");
    }
    if (parsed.exp * 1000 < Date.now()) {
      throw new AuthTokenError("expired", "Magic link has expired.");
    }
  } else {
    if (
      typeof parsed.email !== "string" ||
      typeof parsed.slug !== "string" ||
      typeof parsed.role !== "string" ||
      typeof parsed.version !== "number" ||
      typeof parsed.iat !== "number" ||
      typeof parsed.abs_exp !== "number" ||
      typeof parsed.sld_exp !== "number"
    ) {
      throw new AuthTokenError("malformed", "Session payload is missing fields.");
    }
    const now = Math.floor(Date.now() / 1000);
    if (parsed.abs_exp < now || parsed.sld_exp < now) {
      throw new AuthTokenError("expired", "Session has expired.");
    }
  }

  if (guards?.slug && guards.slug !== parsed.slug) {
    throw new AuthTokenError("slug_mismatch", "Token is for a different event.");
  }
  if (
    typeof guards?.version === "number" &&
    guards.version !== parsed.version
  ) {
    throw new AuthTokenError(
      "version_mismatch",
      "Token has been superseded (session revoked or rotated).",
    );
  }

  return parsed as Extract<TokenPayload, { type: T }>;
}

// ─── Policy constants ──────────────────────────────────────────────────────

/** 15-minute magic link TTL. Long enough for email delivery + click, short
    enough that a leaked link isn't a long-term exposure. */
export const MAGIC_LINK_TTL_SEC = 15 * 60;

/** 30-day absolute session lifetime. After this, forced re-login. */
export const SESSION_ABSOLUTE_TTL_SEC = 30 * 24 * 60 * 60;

/** 7-day sliding window. Each request within the window extends to +7d,
    bounded by the absolute lifetime above. */
export const SESSION_SLIDING_TTL_SEC = 7 * 24 * 60 * 60;

/** When sliding_exp - now drops below this, middleware issues a fresh
    cookie. Keeping this at ~60% of the sliding window means a given
    session writes a new cookie roughly every 4–5 days of active use. */
export const SESSION_SLIDING_REFRESH_SEC = 5 * 24 * 60 * 60;
