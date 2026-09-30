/** The canonical origin — absolute URLs in metadata, sitemap and robots come from here. */
export const SITE_URL = "https://fitcheck.space";

/** The pages a search engine may index. Everything else is behind sign-in. */
export const PUBLIC_PATHS = ["/", "/sign-in", "/privacy", "/terms"] as const;

/** Public and crawlable (robots allow, alternates), but never a search result: kept out of the sitemap and marked
 *  noindex in the page metadata. A login form is not something a searcher is looking for. */
export const NOINDEX_PATHS = ["/sign-in"] as const satisfies readonly (typeof PUBLIC_PATHS)[number][];

/** App surfaces — they redirect signed-out visitors, so indexing them yields nothing. */
export const PRIVATE_PREFIXES = [
  "/closet", "/outfits", "/generate", "/profile", "/settings", "/stats",
  "/calendar", "/packing", "/onboarding", "/auth", "/api", "/monitoring", "/billing",
] as const;

/** Openable by anyone with the exact URL; never in the sitemap; noindex in its metadata, NOT disallowed in robots
 *  (link-preview crawlers honour robots.txt — spec §0 A2). */
export const UNLISTED_PREFIXES = ["/l"] as const;
