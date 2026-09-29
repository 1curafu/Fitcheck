import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

export type CookieToSet = { name: string; value: string; options: Parameters<NextResponse["cookies"]["set"]>[2] };

/**
 * Refreshes the Supabase session. Refreshed cookies are written onto the REQUEST (so whatever response the caller
 * builds forwards them to Server Components on this same request) and returned for the caller to set on its response.
 */
export async function refreshSession(request: NextRequest): Promise<CookieToSet[]> {
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
  await supabase.auth.getUser();

  return toSet;
}
