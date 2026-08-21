import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

/**
 * The Server Component / Server Action Supabase client.
 *
 * ⚠️ `await connection()` declares everything downstream as request-time.
 * `supabase.auth.getUser()` checks token expiry against `Date.now()`, and under
 * Cache Components Next flags an unstable value encountered while prerendering
 * — `blocking-prerender-current-time`, raised on TEN routes, including
 * `/onboarding` and `/settings`, which contain no clock read of their own.
 *
 * ⚠️ **It never appeared in `npm run build`.** Only the dev overlay and the
 * dev-server log show it, which is why walking the app in dev is a required
 * step and not a formality. `npm run insights` automates it.
 *
 * **Scope, stated honestly:** the shells rendered correctly with or without
 * this call — measured, byte-identical at 6553 for `/closet`. What it fixes is
 * eleven error-level log lines per walk, which in production is noise that
 * hides real errors, plus the framework's own explicit instruction. It is NOT
 * the case that every route was broken; an earlier claim that it was is
 * overstated.
 */
export async function createClient() {
  await connection();
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — the middleware refreshes the session.
          }
        },
      },
    },
  );
}
