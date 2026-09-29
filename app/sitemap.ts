import type { MetadataRoute } from "next";
import { PUBLIC_PATHS, SITE_URL } from "@/lib/site";
import { localizedPath, SHIPPED_LOCALES } from "@/lib/i18n/locales";
import { alternatesFor } from "@/lib/i18n/alternates";

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.flatMap((path) => SHIPPED_LOCALES.map(locale => ({
    url: `${SITE_URL}${localizedPath(locale, path)}`,
    alternates: { languages: alternatesFor(path, locale)!.languages as Record<string, string> },
    changeFrequency: path === "/" ? "monthly" : "yearly",
    priority: path === "/" ? 1 : 0.3,
  })));
}
