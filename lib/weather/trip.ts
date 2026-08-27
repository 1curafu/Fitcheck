import { RAIN_CODES } from "./open-meteo";
import { roundCoord } from "./location";
import type { Weather } from "@/lib/generator/rules";

/**
 * Open-Meteo's forecast horizon. Beyond this it returns nothing, and a trip
 * planned three months out is an ordinary thing to do.
 */
export const FORECAST_DAYS_MAX = 16;

export type TripForecast = {
  /** date (`YYYY-MM-DD`) → the weather the look for that day is built for. */
  byDate: Record<string, Weather>;
  /**
   * ⚠️ True when some day of the trip is past the forecast horizon and is
   * therefore using a STAND-IN, not a forecast.
   *
   * The screen must say so. A capsule built on invented weather is worse than
   * one that admits it does not know: the user would pack for 22° because we
   * showed them 22°, and we would have made that up.
   */
  beyondHorizon: boolean;
};

/** Map Open-Meteo's daily arrays into one `Weather` per date. */
export function mapTripForecast(
  raw: {
    daily?: {
      time?: string[];
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
      weather_code?: number[];
    };
  },
  dates: string[],
): TripForecast {
  const times = raw.daily?.time ?? [];
  const highs = raw.daily?.temperature_2m_max ?? [];
  const lows = raw.daily?.temperature_2m_min ?? [];
  const codes = raw.daily?.weather_code ?? [];

  const known = new Map<string, Weather>();
  times.forEach((date, i) => {
    const high = highs[i];
    const low = lows[i];
    if (high == null || low == null) return;
    known.set(date, {
      // The look is built for the day's HIGH — the cold end is handled by
      // advice, not by putting a coat in every flat-lay. Same rule as the
      // daily drop (`rules.ts`).
      tempC: Math.round(high),
      highC: Math.round(high),
      lowC: Math.round(low),
      rain: RAIN_CODES.has(codes[i] ?? 0),
    });
  });

  const byDate: Record<string, Weather> = {};
  let beyondHorizon = false;

  // The furthest day we actually have. Used as the stand-in for anything past
  // the horizon — the nearest real data rather than an invented average.
  const lastKnown = times.length ? known.get(times[times.length - 1]) : undefined;

  for (const date of dates) {
    const hit = known.get(date);
    if (hit) {
      byDate[date] = hit;
      continue;
    }
    beyondHorizon = true;
    byDate[date] = lastKnown ?? { tempC: 15, highC: 18, lowC: 11, rain: false };
  }

  return { byDate, beyondHorizon };
}

/**
 * Daily forecast across a trip's date range.
 *
 * ⚠️ **Rounded coordinates at the boundary**, as `fetchForecast` does: every
 * caller gets a cache-friendly URL and raw GPS precision never leaves the app.
 *
 * ⚠️ **Cached with `next: { revalidate }` rather than `use cache`.** Decision 6:
 * `use cache` is in-memory and dies with the serverless instance; this survives.
 */
export async function fetchTripForecast(
  lat: number,
  lon: number,
  dates: string[],
): Promise<TripForecast> {
  if (dates.length === 0) return { byDate: {}, beyondHorizon: false };

  const days = Math.min(FORECAST_DAYS_MAX, Math.max(1, daysFromToday(dates[dates.length - 1])));
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${roundCoord(lat)}&longitude=${roundCoord(lon)}` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code` +
    `&forecast_days=${days}&timezone=auto`;

  const res = await fetch(url, { next: { revalidate: 1800 } });
  return mapTripForecast(await res.json(), dates);
}

/** Whole days from today to `date`, at least 1. */
function daysFromToday(date: string): number {
  const target = new Date(`${date}T00:00:00Z`).getTime();
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();
  if (Number.isNaN(target)) return 1;
  return Math.ceil((target - today) / 86_400_000) + 1;
}
