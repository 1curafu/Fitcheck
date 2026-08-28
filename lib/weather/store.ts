import { createClient } from "@supabase/supabase-js";
import type { CacheStore, CachedDay } from "./cache";

/**
 * The Postgres side of the weather cache.
 *
 * ⚠️ **THE ONLY SERVICE-ROLE CLIENT IN THIS CODEBASE, AND IT MUST STAY THAT
 * WAY.** `CLAUDE.md` says every DB access relies on RLS and there is no
 * service-role bypass in app code. This is a deliberate, narrow exception:
 *
 *   - `weather_cache` holds NO user data. It is public weather, keyed by place
 *     and day, identical for everyone in a city.
 *   - The table has a SELECT policy and **no insert policy at all**, because
 *     PostgREST is a public endpoint — `insert ... with check (true)` would let
 *     any signed-in user POST a fabricated forecast and poison a whole city.
 *   - So the write has to come from somewhere, and this is it.
 *
 * ⚠️ Do not import this module from anywhere else. If a second caller ever
 * needs it, that is the moment to stop and re-read Decision 1's reasoning
 * rather than widen the exception quietly.
 */
function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    // No session, no refresh, no storage: this client is never a user.
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type Row = { lat: number; lon: number; day: string; payload: CachedDay; fetched_at: string };

/**
 * ⚠️ Every method degrades to "no cache" rather than throwing.
 *
 * A cache that can take the app down is worse than no cache. If Supabase is
 * unreachable, a read returns empty (so the caller fetches live) and a write is
 * dropped (so the next request fetches again). Both are slow, neither is broken.
 */
export function postgresStore(): CacheStore {
  return {
    async read(lat, lon, dates) {
      const out = new Map<string, { payload: CachedDay; fetchedAt: Date }>();
      const db = serviceClient();
      if (!db || dates.length === 0) return out;

      const { data, error } = await db
        .from("weather_cache")
        .select("lat, lon, day, payload, fetched_at")
        .eq("lat", lat)
        .eq("lon", lon)
        .in("day", dates);

      if (error || !data) return out;
      for (const row of data as Row[]) {
        out.set(row.day, { payload: row.payload, fetchedAt: new Date(row.fetched_at) });
      }
      return out;
    },

    async write(entries) {
      const db = serviceClient();
      if (!db || entries.length === 0) return;

      const rows = entries.map((e) => ({
        lat: e.lat,
        lon: e.lon,
        day: e.day,
        payload: e.payload,
        fetched_at: e.fetchedAt.toISOString(),
      }));

      /**
       * ⚠️ UPSERT on the composite key, deliberately — not insert, and not
       * delete-then-insert.
       *
       * It has to serve two cases at once. **Refresh:** a row past
       * `WEATHER_MAX_AGE_H` must be REPLACED, which rules out
       * `ignoreDuplicates`. **Concurrency:** a city waking up at 08:00 means two
       * requests miss, both fetch and both write, which rules out a bare insert
       * (duplicate key) and rules out delete-then-insert too — that races with
       * itself, since both writers can delete before either inserts.
       *
       * `on conflict do update` is the one form where the loser of the race is
       * harmless: the rows are equivalent, so last-write-wins costs nothing.
       */
      await db.from("weather_cache").upsert(rows, { onConflict: "lat,lon,day" });
    },
  };
}
