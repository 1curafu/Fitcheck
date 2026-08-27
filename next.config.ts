import { withSentryConfig } from "@sentry/nextjs";
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
    /**
     * Bailing out of a prerender is how Next signals "this needs request-time
     * data" — it THROWS, and any `try/catch` already wrapping the call catches
     * it and logs it. Our Server Actions all have one, so every prerendered
     * route emitted "fetch() rejects when the prerender is complete" on every
     * build and request.
     *
     * ⚠️ This hides logs emitted AFTER a bail-out, not real errors during
     * rendering. The migration guide names this flag for exactly this noise.
     */
    hideLogsAfterAbort: true,
    // Capture sends the base64 original JPEG + PNG cutout to the uploadAndTag
    // Server Action in one call; the two blobs exceed the default 1 MB body cap.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "fitcheck-00",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
