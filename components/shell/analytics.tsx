"use client";

import { Analytics } from "@vercel/analytics/next";
import { redactShareUrl } from "@/lib/share/redact";

/** Vercel Analytics without share tokens in page URLs. A client wrapper: a server layout cannot pass a function. */
export function SiteAnalytics() {
  return <Analytics beforeSend={(event) => ({ ...event, url: redactShareUrl(event.url) })} />;
}
