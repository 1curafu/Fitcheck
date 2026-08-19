import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Cache Components + Partial Prefetching (Next 16.3).
   *
   * Nothing is cached unless it says `use cache`, and Next extracts a
   * prerenderable shell from each route and prefetches it, so a shell is on
   * screen the instant a link is tapped and the user-specific part streams in
   * behind it.
   *
   * ⚠️ **The shell must never contain user data.** Every route here reads the
   * auth cookie, and a shell cached on a route key rather than a user key
   * serves one person's wardrobe to another. RLS protects the database READ;
   * it does nothing about an already-rendered fragment held in a cache. See
   * `docs/superpowers/plans/todo/2026-08-19-instant-navigations.md`, Task 3.
   */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Capture sends the base64 original JPEG + PNG cutout to the uploadAndTag
    // Server Action in one call; the two blobs exceed the default 1 MB body cap.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
