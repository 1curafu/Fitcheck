import type { MetadataRoute } from "next";
import { PRIVATE_PREFIXES, PUBLIC_PATHS, SITE_URL } from "@/lib/site";

import { LOCALE_PREFIXES } from "@/lib/i18n/locales";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: [...PUBLIC_PATHS], disallow: Object.values(LOCALE_PREFIXES).flatMap(prefix => PRIVATE_PREFIXES.map(p => `${prefix}${p}/`)) },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
