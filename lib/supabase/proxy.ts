import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

export type CookieToSet = { name: string; value: string; options: Parameters<NextResponse["cookies"]["set"]>[2] };

/**
 * Refreshes the Supabase session. Refreshed cookies are written onto the REQUEST (so whatever response the caller
 * builds forwards them to Server Components on this same request) and returned for the caller to set on its response.
 * `signedIn` is ROUTING ONLY (the landing sends a signed-in visitor into the app); it is never authorization —
 * protected pages and actions still call `getUser()` themselves.
 */
export async function refreshSession(request: NextRequest): Promise<{ cookies: CookieToSet[]; signedIn: boolean }> {
  const toSet: CookieToSet[] = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value));
          toSet.push(...cookies);
        },
      },
    },
  );

  // Refreshes the auth token and rewrites the cookies. Do not run other logic
  // between createServerClient and getUser() — it can cause random logouts.
  const { data: { user } } = await supabase.auth.getUser();

  return { cookies: toSet, signedIn: user !== null };
}
