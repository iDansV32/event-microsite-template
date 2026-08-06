import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiter.
 *
 * Primary backend: Upstash Ratelimit (sliding window) over Upstash Redis
 * REST, configured via UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
 * The REST transport works from both Node and Edge runtimes, which
 * matters here because middleware.ts could grow its own limits later
 * and it runs on the edge.
 *
 * Fallback: if the env vars are unset, or an Upstash call errors out
 * mid-request, we degrade to the in-process sliding-window store at
 * the bottom of this file. That keeps local dev painless (no Redis
 * required) and means a transient Upstash outage doesn't take down
 * every login / RSVP / resend.
 *
 * Shared shape: the public API is a single async rateLimit(key, opts)
 * returning { allowed, retryAfterMs, remaining }. Callers don't care
 * which backend answered; they just read `allowed` and shape a 429.
 *
 * Fan-out: we keep a per-(limit, windowMs) Ratelimit instance in a
 * module-level Map so repeated calls with the same config reuse one
 * object instead of constructing a new one per request. The Redis
 * client is memoized the same way.
 */

export interface RateLimitResult {
  allowed: boolean;
  /** Milliseconds the client should wait before retrying. 0 when allowed. */
  retryAfterMs: number;
  /** Remaining attempts in the current window (after this call). */
  remaining: number;
}

// ─── Upstash path ───────────────────────────────────────────────────────────

let _redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    _redis = null;
    return null;
  }
  _redis = new Redis({ url, token });
  return _redis;
}

const limiterCache = new Map<string, Ratelimit>();

function getLimiter(opts: { limit: number; windowMs: number }): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const cacheKey = `${opts.limit}:${opts.windowMs}`;
  const existing = limiterCache.get(cacheKey);
  if (existing) return existing;
  // Upstash's Duration type accepts "N s" / "N m" / "N h" etc. We always
  // express in seconds to avoid rounding surprises — callers specify
  // windowMs, so ceil to the nearest whole second.
  const windowSec = Math.max(1, Math.ceil(opts.windowMs / 1000));
  const lim = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(opts.limit, `${windowSec} s`),
    prefix: "event-rl",
    // Analytics adds a secondary Redis write per call. Off by default
    // because we don't consume the analytics dashboard; turning it on
    // is free on the Upstash side, so a future operator can enable it.
    analytics: false,
  });
  limiterCache.set(cacheKey, lim);
  return lim;
}

// ─── In-memory fallback ─────────────────────────────────────────────────────

type Bucket = { timestamps: number[] };
const memoryStore = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

function inMemoryLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - opts.windowMs;
  const bucket = memoryStore.get(key) ?? { timestamps: [] };

  const fresh: number[] = [];
  for (const t of bucket.timestamps) if (t > cutoff) fresh.push(t);

  if (fresh.length >= opts.limit) {
    const oldest = fresh[0];
    const retryAfterMs = Math.max(0, oldest + opts.windowMs - now);
    memoryStore.set(key, { timestamps: fresh });
    return { allowed: false, retryAfterMs, remaining: 0 };
  }

  fresh.push(now);
  memoryStore.set(key, { timestamps: fresh });

  if (memoryStore.size > MAX_KEYS) sweepMemory(now - opts.windowMs);

  return {
    allowed: true,
    retryAfterMs: 0,
    remaining: Math.max(0, opts.limit - fresh.length),
  };
}

function sweepMemory(cutoff: number): void {
  for (const [k, b] of memoryStore) {
    const lastActivity = b.timestamps.length
      ? b.timestamps[b.timestamps.length - 1]
      : 0;
    if (lastActivity < cutoff) memoryStore.delete(k);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

let warnedMissingEnv = false;
let warnedUpstashError = false;

export async function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  const limiter = getLimiter(opts);

  if (limiter) {
    try {
      const res = await limiter.limit(key);
      // Upstash reports `reset` as a unix ms timestamp marking when the
      // current window closes (and the caller can retry). Convert to a
      // relative "wait this many ms" for the Retry-After header.
      const retryAfterMs = Math.max(0, res.reset - Date.now());
      return {
        allowed: res.success,
        retryAfterMs: res.success ? 0 : retryAfterMs,
        remaining: res.remaining,
      };
    } catch (err) {
      // Upstash REST is unreachable or returned an error. Degrade to
      // in-memory for this request rather than 500-ing every login /
      // RSVP. We log once per process so a prolonged outage doesn't
      // spam the logs.
      if (!warnedUpstashError) {
        // eslint-disable-next-line no-console
        console.error(
          "[rate-limit] Upstash call failed; degrading to in-memory for affected requests until the process restarts or Upstash recovers:",
          err instanceof Error ? err.message : err,
        );
        warnedUpstashError = true;
      }
      return inMemoryLimit(key, opts);
    }
  }

  if (!warnedMissingEnv && process.env.NODE_ENV === "production") {
    // eslint-disable-next-line no-console
    console.warn(
      "[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set; using in-memory limiter. This works for single-instance deploys but does NOT share state across serverless cold starts or regions. Set both env vars for production.",
    );
    warnedMissingEnv = true;
  }
  return inMemoryLimit(key, opts);
}

/**
 * Derive a stable client key from Next.js headers. Picks the first IP
 * in x-forwarded-for, falls back to x-real-ip, then "unknown". Callers
 * should combine this with a route-specific prefix so limits for
 * different endpoints don't share a bucket.
 */
export function clientKey(headers: Headers, prefix: string): string {
  const xff = headers.get("x-forwarded-for");
  const ip =
    (xff ? xff.split(",")[0].trim() : null) ??
    headers.get("x-real-ip") ??
    "unknown";
  return `${prefix}:${ip}`;
}
