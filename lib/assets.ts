import { env } from "./env";

/**
 * Resolve an asset reference from event content into a URL suitable for
 * `<img src>` / next/image.
 *
 * Inputs come in two shapes:
 *
 *   1. Absolute or site-root URLs — e.g. `https://cdn…/x.jpg` or
 *      `/images/hotel/pool-1.jpg`. These are already live URLs; pass
 *      through unchanged. This is how the current demo works — files
 *      live under /public and are referenced by their public path.
 *
 *   2. Opaque asset keys — e.g. `pool-1.jpg` or `day-3/pool.jpg`, with
 *      NO leading slash and no scheme. These are resolved against the
 *      configured Supabase Storage bucket at NEXT_PUBLIC_SUPABASE_URL /
 *      NEXT_PUBLIC_SUPABASE_ASSETS_BUCKET. If the env var is unset, the
 *      key is returned as-is (useful for dev where an author may drop
 *      files into /public/events/<slug>/ before Supabase is wired).
 *
 * No automatic rewrite to `/events/<slug>/assets/<key>` — that path was
 * never a real route.
 */
export function resolveAsset(
  slug: string,
  key: string | undefined,
): string | null {
  if (!key) return null;

  // Already a URL the browser can fetch directly — pass through.
  if (/^https?:\/\//.test(key) || key.startsWith("/")) return key;

  // Opaque key: resolve against Supabase Storage when configured.
  const publicUrl = env.supabase.publicUrl();
  if (publicUrl) {
    const bucket = env.supabase.assetsBucket();
    return `${publicUrl}/storage/v1/object/public/${bucket}/${slug}/${key}`;
  }

  // No Supabase URL in the env and no leading slash: return the key
  // unchanged. The caller is on their own to place the file somewhere
  // the browser can reach it.
  return key;
}
