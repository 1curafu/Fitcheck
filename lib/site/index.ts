/** The canonical origin — absolute URLs in metadata, sitemap and robots come from here. */
export const SITE_URL = "https://fitcheck.space";

/** The pages a search engine may index. Everything else is behind sign-in. */
export const PUBLIC_PATHS = ["/", "/privacy", "/terms"] as const;

/** App surfaces — they redirect signed-out visitors, so indexing them yields nothing. */
export const PRIVATE_PREFIXES = [
  "/closet", "/outfits", "/generate", "/profile", "/settings", "/stats",
  "/calendar", "/packing", "/onboarding", "/auth", "/api", "/monitoring",
] as const;
