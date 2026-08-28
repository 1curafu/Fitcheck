import { roundCoord } from "./location";
import { localParts, DAILY_MAX } from "./openweather";

/**
 * The read-through weather cache.
 *
 * ⚠️ **Calls scale with CITIES per day, not with users.** That is the whole
 * point: `roundCoord` (2dp ≈ 1.1km) normalises the key at the boundary so every
 * caller in one place produces the same row.
 *
 * ⚠️ **Postgres, not `next: { revalidate }`.** The Data Cache is per-deployment,
 * not guaranteed shared across instances, and gone on redeploy — Decision 6
 * records the sibling trap where `use cache` dies with the instance. This is
 * also where the Redis question already landed: rejected, because Postgres
 * already IS the cache.
 *
 * ⚠️ **The cache must NEVER be exposed as an endpoint.** ODbL ShareAlike
 * attaches to a weather dataset or API made available outside the organisation.
 * Internal caching is fine; a public route over it is not.
 */

/**
 * ⚠️ ONE CALL 4.0 COSTS THREE ENDPOINTS, NOT ONE — `current`, `timeline/1h` and
 * `timeline/1day` — where 3.0 returned all three blocks in a single payload.
 * The naive shape is therefore 3 calls per city per day (≈333 cities on the
 * 1,000/day free tier).
 *
 * ⚠️ **This module deliberately makes it TWO, by dropping the `current` call.**
 * That is not an optimisation; it is the only design that satisfies both of the
 * plan's own constraints at once:
 *
 *   - `current` CANNOT be cached per-day — the pill would show the 08:00
 *     reading at 18:00, which the plan calls out explicitly.
 *   - `current` CANNOT be fetched per-request either — then calls scale with
 *     USERS, which is the entire thing this cache exists to prevent.
 *
 * There is no third option, so the current reading is derived from the HOURLY
 * cell containing now (`mapOneCall` already picks it, and marks it `isNow`).
 * Measured on the capture fixture the two agree to 0.04°C — 18.81 against 18.85,
 * indistinguishable after `Math.round` — and the derived value has the property
 * the cached one cannot: it moves through the day without another call.
 *
 * ⚠️ **To go back to 3 calls** (a true nowcast on the pill), fetch
 * `/onecall/current` per request and merge it over the derived reading. Expect
 * calls to scale with users again, and budget accordingly.
 */
export const CALLS_PER_CITY_PER_DAY = 2;

/**
 * How old a row may be before it is refetched.
 *
 * ⚠️ Presence is not freshness: a row written at 06:00 is an 18-hour-old
 * prediction by midnight. Six hours caps that at ~4 calls per city per day
 * (≈250 cities free) while keeping an afternoon forecast that was made this
 * morning rather than yesterday.
 */
export const WEATHER_MAX_AGE_H = 6;

/**
 * The TIME-INVARIANT series for one place and one local day.
 *
 * ⚠️ NOT `mapForecast`'s output. Every field that mapper returns depends on the
 * moment of asking — high/low are deliberately the peak still AHEAD, not the
 * calendar day's — so caching a collapsed payload for a day would plan an
 * evening look against a peak that had already passed. Store the series; derive
 * the view per request.
 *
 * ⚠️ Our shape, never the provider's. A future swap should touch one adapter,
 * not every reader.
 */
export type CachedDay = {
  timezone: string;
  timezoneOffset: number;
  hourly: { dt: number; temp: number; feelsLike: number; conditionId: number }[];
  daily: { dt: number; max: number; min: number; conditionId: number } | null;
};

export type CacheStore = {
  read(lat: number, lon: number, dates: string[]): Promise<Map<string, { payload: CachedDay; fetchedAt: Date }>>;
  write(entries: { lat: number; lon: number; day: string; payload: CachedDay; fetchedAt: Date }[]): Promise<void>;
};

type RawResponse = {
  timezone?: string;
  timezone_offset?: number;
  data?: {
    dt: number;
    temp?: number | { min?: number; max?: number };
    feels_like?: number | { day?: number };
    weather?: { id: number }[];
  }[];
};

/** Group one raw `1day` + one raw `1h` response into per-local-date series. */
function toSeries(daily: RawResponse | null, hourly: RawResponse | null): Map<string, CachedDay> {
  const timezone = daily?.timezone ?? hourly?.timezone ?? "UTC";
  const offset = daily?.timezone_offset ?? hourly?.timezone_offset ?? 0;
  const out = new Map<string, CachedDay>();

  const blank = (): CachedDay => ({ timezone, timezoneOffset: offset, hourly: [], daily: null });

  for (const row of daily?.data ?? []) {
    const t = typeof row.temp === "object" ? row.temp : undefined;
    if (t?.max == null || t?.min == null) continue;
    const { date } = localParts(row.dt, offset);
    const entry = out.get(date) ?? blank();
    entry.daily = { dt: row.dt, max: t.max, min: t.min, conditionId: row.weather?.[0]?.id ?? 800 };
    out.set(date, entry);
  }

  for (const row of hourly?.data ?? []) {
    const { date } = localParts(row.dt, offset);
    const entry = out.get(date) ?? blank();
    entry.hourly.push({
      dt: row.dt,
      temp: typeof row.temp === "number" ? row.temp : 0,
      feelsLike: typeof row.feels_like === "number" ? row.feels_like : 0,
      conditionId: row.weather?.[0]?.id ?? 800,
    });
    out.set(date, entry);
  }

  return out;
}

/**
 * Read the series for `dates`, fetching only what is missing or stale.
 *
 * One fetch fills EVERY day it covers — One Call returns up to `DAILY_MAX` daily
 * blocks in a single response, so a ten-day trip costs one call, not ten. That
 * fan-out is the economic case for this design and it is asserted in the tests.
 */
export async function cachedSeries(args: {
  lat: number;
  lon: number;
  dates: string[];
  store: CacheStore;
  daily: () => Promise<unknown>;
  hourly: () => Promise<unknown>;
  now?: Date;
}): Promise<Map<string, CachedDay>> {
  const { dates, store } = args;
  const lat = roundCoord(args.lat);
  const lon = roundCoord(args.lon);
  const now = args.now ?? new Date();
  if (dates.length === 0) return new Map();

  const cached = await store.read(lat, lon, dates);

  const cutoff = now.getTime() - WEATHER_MAX_AGE_H * 3600_000;
  const fresh = new Map<string, CachedDay>();
  const stale = new Map<string, CachedDay>();
  for (const [day, row] of cached) {
    (row.fetchedAt.getTime() >= cutoff ? fresh : stale).set(day, row.payload);
  }

  const missing = dates.filter((d) => !fresh.has(d));
  if (missing.length === 0) return fresh;

  let fetched: Map<string, CachedDay>;
  try {
    // Both in flight together — they are independent endpoints.
    const [d, h] = await Promise.all([args.daily(), args.hourly()]);
    fetched = toSeries(d as RawResponse, h as RawResponse);
  } catch {
    /**
     * ⚠️ Serve the stale row rather than throwing. A day-old temperature is a
     * far better outcome than a screen with no weather — and a date we have
     * never seen simply stays absent, which callers already handle as
     * `beyondHorizon`.
     */
    return new Map([...stale, ...fresh]);
  }

  if (fetched.size > 0) {
    /**
     * ⚠️ `on conflict do nothing`, and the write is deliberately NOT awaited
     * into the failure path: a city waking up at 08:00 is the concurrent case,
     * and a lost race there must not blank the strip for whoever lost it.
     */
    try {
      await store.write(
        [...fetched].slice(0, DAILY_MAX).map(([day, payload]) => ({ lat, lon, day, payload, fetchedAt: now })),
      );
    } catch {
      // The data is in hand; failing to memoise it is not a reason to fail the read.
    }
  }

  const out = new Map<string, CachedDay>(fresh);
  for (const [day, payload] of fetched) out.set(day, payload);
  // Anything still absent falls back to a stale row if we have one.
  for (const [day, payload] of stale) if (!out.has(day)) out.set(day, payload);
  return out;
}
