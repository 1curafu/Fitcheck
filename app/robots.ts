import type { MetadataRoute } from "next";
import { PRIVATE_PREFIXES, PUBLIC_PATHS, SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: [...PUBLIC_PATHS], disallow: PRIVATE_PREFIXES.map((p) => `${p}/`) },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
