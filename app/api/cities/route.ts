import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapSearch } from "@/lib/weather/geocode";

/**
 * City search, proxied so the OpenWeather key stays on the server.
 *
 * ⚠️ **Why a route handler and not a Server Action**, which is this codebase's
 * default: React SERIALISES Server Action calls from one client. This is a
 * typeahead firing per keystroke, so serialising turns "Zurich" into five
 * sequential round trips that each wait for the last. A route handler runs them
 * in parallel and — the part that actually matters — is cancellable, so
 * `searchCities` passes an `AbortSignal` and abandoned keystrokes cost nothing.
 *
 * ⚠️ **Auth-gated, deliberately.** Two reasons, and the second is the one that
 * is easy to miss:
 *   1. An open proxy over our OpenWeather quota is somebody else's free API.
 *   2. ODbL ShareAlike attaches to OpenWeather data made available OUTSIDE the
 *      organisation. Serving our own signed-in users is internal use; an
 *      unauthenticated public endpoint is much closer to the line the licence
 *      draws, and it is the same line recorded for `weather_cache`.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  // The same two-character floor the picker applies, enforced here too: a
  // client-side guard is a UX affordance, not a limit.
  if (q.length < 2) return NextResponse.json([]);

  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return NextResponse.json([]);

  const url =
    `https://api.openweathermap.org/geo/1.0/direct` +
    `?q=${encodeURIComponent(q)}&limit=5&appid=${key}`;

  try {
    const res = await fetch(url, {
      // City coordinates do not move. Caching by query is free and keeps
      // repeated searches off the quota entirely.
      next: { revalidate: 86_400 },
    });
    if (!res.ok) return NextResponse.json([]);
    /**
     * ⚠️ Mapped HERE, on the server, not passed through raw. Every provider row
     * carries a `local_names` blob of ~40 translations that nothing renders —
     * by far the largest part of the payload. Shipping it to a phone on every
     * keystroke would be the bulk of the bytes for none of the value.
     */
    return NextResponse.json(mapSearch(await res.json()));
  } catch {
    // An empty list reads as "no matches", which is the right failure for a
    // search box — better than an error state over a half-typed city.
    return NextResponse.json([]);
  }
}
