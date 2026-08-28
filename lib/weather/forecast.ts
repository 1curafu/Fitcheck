import { connection } from "next/server";
import type { HourCell } from "@/lib/generator/types";
import { roundCoord } from "./location";
import { cachedSeries, type CachedDay } from "./cache";
import { postgresStore } from "./store";
import { mapOneCall, mapOneCallDaily, localParts, DAILY_MAX, HOURLY_MAX } from "./openweather";
import type { TripForecast } from "./trip";

/**
 * The live weather layer: OpenWeather One Call 4.0, behind the Postgres cache.
 *
 * ⚠️ Replaces Open-Meteo, whose free API is **not licensed for commercial use**
 * and which sat on the critical path of every drop, reroll, styled look and
 * trip. This was the older of the two launch blockers.
 *
 * ⚠️ **Attribution is a shipping requirement, not a nicety.** ODbL obliges a
 * visible `Weather data © OpenWeather` on the screen where the weather appears.
 * See the picker, the packing day list and the outfit detail.
 *
 * ⚠️ **The cache must never become a public endpoint.** ShareAlike attaches to a
 * weather dataset or API made available outside the organisation; internal
 * caching is fine, a route over it is not.
 */

const BASE = "https://api.openweathermap.org/data/4.0/onecall";

/**
 * ⚠️ The segments are `1day` and `1h`, NOT `daily` and `hourly`. Guessing the
 * latter returns a JSON 404 that is indistinguishable from a missing
 * subscription — that cost most of a session to work out.
 */
function url(path: string, lat: number, lon: number, cnt: number): string {
  const key = process.env.OPENWEATHER_API_KEY ?? "";
  return (
    `${BASE}/${path}?lat=${roundCoord(lat)}&lon=${roundCoord(lon)}` +
    `&cnt=${cnt}&units=metric&appid=${key}`
  );
}

async function getJson(u: string): Promise<unknown> {
  const res = await fetch(u, { cache: "no-store" });
  if (!res.ok) throw new Error(`openweather ${res.status}`);
  return res.json();
}

/**
 * Rebuild the raw-ish shape `mapOneCall` expects from the cached series.
 *
 * ⚠️ This is the half that makes a per-DAY cache legal. The series is
 * time-invariant; everything now-relative — the current reading, the 4-cell
 * strip, `restOfDay`, and the high/low that are the peak still AHEAD — is
 * derived here, per request, from cached data. Cache the collapsed view instead
 * and an evening look gets planned against a peak that has already passed.
 */
function bundleFrom(series: CachedDay[], nowDt: number) {
  const all = series.flatMap((s) => s.hourly).sort((a, b) => a.dt - b.dt);
  const tz = series[0]?.timezone ?? "UTC";
  const offset = series[0]?.timezoneOffset ?? 0;

  /**
   * ⚠️ The current reading is the hourly cell CONTAINING now, not a separate
   * `/onecall/current` call. That is a deliberate 3-calls-to-2 saving and the
   * only design that works: `current` cannot be cached per-day (the pill would
   * show 08:00 at 18:00) and cannot be fetched per-request (calls would scale
   * with users). See `CALLS_PER_CITY_PER_DAY` in cache.ts.
   */
  const idxAfter = all.findIndex((c) => c.dt > nowDt);
  const nowCell = all[idxAfter === -1 ? Math.max(0, all.length - 1) : Math.max(0, idxAfter - 1)];

  const asData = (cells: typeof all) =>
    cells.map((c) => ({
      dt: c.dt,
      temp: c.temp,
      feels_like: c.feelsLike,
      weather: [{ id: c.conditionId }],
    }));

  /**
   * ⚠️ TODAY's daily block must be passed through, not left empty. It is rung 2
   * of `mapOneCall`'s high/low fallback — used when the hourly series runs out,
   * which with a 20-hour window is an ordinary occurrence rather than a fault.
   * An earlier version sent `data: []` here, silently collapsing the range to
   * the current reading whenever that happened.
   */
  const today = series.find((s) => s.daily !== null)?.daily ?? null;

  return {
    current: {
      timezone: tz,
      timezone_offset: offset,
      data: nowCell ? asData([nowCell]) : [],
    },
    hourly: { timezone: tz, timezone_offset: offset, data: asData(all) },
    daily: {
      timezone: tz,
      timezone_offset: offset,
      data: today
        ? [{ dt: today.dt, temp: { max: today.max, min: today.min }, weather: [{ id: today.conditionId }] }]
        : [],
    },
  };
}

export type Forecast = {
  tempC: number;
  feelsLikeC: number;
  condition: string;
  timezone: string;
  hourly: HourCell[];
  restOfDay: HourCell[];
  highC: number;
  lowC: number;
};

/**
 * Today's forecast for a location.
 *
 * ⚠️ `await connection()` — this reads the clock and hits the network, neither
 * of which can be prerendered. Same reason `lib/outfits/today.ts` and
 * `lib/storage/signed.ts` call it (Decision 6).
 */
export async function fetchForecast(lat: number, lon: number, nowDt?: number): Promise<Forecast> {
  await connection();
  const now = new Date();
  const nowSec = nowDt ?? Math.floor(now.getTime() / 1000);

  // Today AND tomorrow: the 20-hour window straddles midnight, and `mapOneCall`
  // needs the whole run to find the cell containing now before it trims to the
  // local date.
  const dates = [0, 1].map((d) => {
    const t = new Date(now.getTime() + d * 86_400_000);
    return t.toISOString().slice(0, 10);
  });

  const series = await cachedSeries({
    lat,
    lon,
    dates,
    store: postgresStore(),
    daily: () => getJson(url("timeline/1day", lat, lon, DAILY_MAX)),
    hourly: () => getJson(url("timeline/1h", lat, lon, HOURLY_MAX)),
    now,
  });

  return mapOneCall(bundleFrom([...series.values()], nowSec), nowSec);
}

/**
 * Daily forecast across a trip's date range.
 *
 * ⚠️ One fetch fills every day it covers — One Call returns up to `DAILY_MAX`
 * daily blocks in a single response, so a ten-day trip costs ONE call.
 */
export async function fetchTripForecast(
  lat: number,
  lon: number,
  dates: string[],
): Promise<TripForecast> {
  await connection();
  if (dates.length === 0) return { byDate: {}, beyondHorizon: false };

  const series = await cachedSeries({
    lat,
    lon,
    dates,
    store: postgresStore(),
    daily: () => getJson(url("timeline/1day", lat, lon, DAILY_MAX)),
    // A trip needs no hourly detail; skipping it keeps a trip to ONE call.
    hourly: async () => ({ data: [] }),
  });

  const offset = [...series.values()][0]?.timezoneOffset ?? 0;
  const data = [...series.values()]
    .map((s) => s.daily)
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .map((d) => ({
      dt: d.dt,
      temp: { max: d.max, min: d.min },
      weather: [{ id: d.conditionId }],
    }));

  return mapOneCallDaily({ timezone_offset: offset, data }, dates);
}

/** Re-exported so callers need not know where the local-date helper lives. */
export { localParts };
