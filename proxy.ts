import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 "proxy" convention (formerly middleware.ts).
export async function proxy(request: NextRequest) {
  return updateSession(request);
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
     */
    "/((?!_next/static|_next/image|favicon.ico|monitoring|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
