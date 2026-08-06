import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Pin the build/tracing root to THIS directory. Without this, Next walks up
// from the current working directory looking for a lockfile and can land on
// the wrong parent when this repo lives inside another repo — e.g. during
// AI-worktree sessions the tree sits inside a parent project whose own
// package-lock.json shadows ours. Explicit root = no ambiguity in either
// context.
const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
