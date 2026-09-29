import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/lib/i18n/routing";
import { refreshSession } from "@/lib/supabase/proxy";
import { LOCALE_PREFIXES } from "@/lib/i18n/locales";

const intl = createIntlMiddleware(routing);
/** Never localized: handlers, callbacks and the billing return keep one URL for every language. */
const LOCALE_FREE = /^\/(auth|api|billing\/return)(\/|$)/;
/** The public landing in every locale: "/", "/uk", "/en-gb", … (a trailing slash tolerated). */
const LANDING = new RegExp(`^(${Object.values(LOCALE_PREFIXES).filter(Boolean).join("|")})?/?$`);

// Next.js 16 "proxy" convention (formerly middleware.ts).
export async function proxy(request: NextRequest) {
  const { cookies: refreshed, signedIn } = await refreshSession(request);
  const { pathname } = request.nextUrl;
  let response = LOCALE_FREE.test(pathname) ? NextResponse.next({ request }) : intl(request);
  // The landing is for visitors. A signed-in launch (the installed app opens "/") goes straight into the app from
  // here, so it never paints the marketing page first — the in-page SignedInRedirect streams too late for that
  // (~150 ms of landing, measured). Locale routing wins first: if next-intl already redirects, that stands.
  // Routing only: /onboarding re-checks the session itself and forwards onboarded users to /closet.
  if (signedIn && (request.method === "GET" || request.method === "HEAD") && LANDING.test(pathname)
    && !response.headers.get("location")) {
    // A plain URL, not nextUrl.clone(): NextURL re-appends the original trailing slash ("/de/" → "/de/onboarding/").
    response = NextResponse.redirect(new URL(`${pathname.replace(/\/$/, "")}/onboarding`, request.url));
  }
  refreshed.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}

export const config = {
  matcher: [
    /*
     * Run on all request paths except static assets and image files, so the
     * session cookie is refreshed on every navigation.
     *
     * ⚠️ `monitoring` is excluded deliberately. Sentry's `tunnelRoute` proxies
     * every browser error report through `/monitoring` to get past ad-blockers,
     * and this matcher would otherwise run a full Supabase session refresh —
     * a database round-trip — on each one. Sentry's own setup comment warns
     * that the tunnel route must not collide with middleware; this is that
     * collision, avoided rather than discovered in a bill.
     *
     * `api/stripe/webhook` is excluded too: Stripe carries no session, and the
     * request's signature is its authentication.
     */
    "/((?!_next/static|_next/image|ort/|models/|favicon.ico|monitoring|api/stripe/webhook|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
