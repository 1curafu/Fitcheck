import { SITE_URL } from "@/lib/site";

const PREVIEW = /^https:\/\/fitcheck-[a-z0-9-]+\.vercel\.app$/;
const LOCAL = new Set(["http://localhost:3000", "http://127.0.0.1:3000"]);

/** Checkout/portal return URLs follow the request's origin only when it is ours; anything else is production. */
export function trustedOrigin(origin: string | null): string {
  if (!origin) return SITE_URL;
  if (origin === SITE_URL || LOCAL.has(origin) || PREVIEW.test(origin)) return origin;
  return SITE_URL;
}
