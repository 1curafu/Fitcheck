import type { HourCell } from "@/lib/generator/types";
import { roundCoord } from "@/lib/weather/location";

export const RAIN_CODES = new Set([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99]);

type Raw = {
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability: number[];
  };
  /**
   * Today's range. Optional so older fixtures and any cached response without it
   * still map — callers fall back to the current temperature, which is the
   * behaviour that shipped before.
   */
  daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[] };
};

function conditionFor(code: number): string {
  if (RAIN_CODES.has(code)) return "Rain";
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  return "Overcast";
}

/** "2026-01-14T18:00" → "18:00" */
function hhmm(iso: string): string {
  return (iso.split("T")[1] ?? "").slice(0, 5);
}

/**
 * Pure — never calls the clock. `nowIso` defaults to `raw.current.time`, which is
 * local time AT THE LOCATION (because we send timezone=auto) and therefore on the
 * same clock as `raw.hourly.time`. Callers may still inject a now for tests.
 */
export function mapForecast(
  raw: Raw,
  nowIso: string = raw.current.time,
): {
  tempC: number;
  feelsLikeC: number;
  condition: string;
  timezone: string;
  hourly: HourCell[];
  /** Every remaining hour of TODAY — what the look is planned against. */
  restOfDay: HourCell[];
  highC: number;
  lowC: number;
} {
  const times = raw.hourly.time;
  let nowIdx = times.findIndex((t) => t >= nowIso); // first hour at/after now
  if (nowIdx < 0) nowIdx = 0;

  const hourly: HourCell[] = [];
  for (let k = 0; k < 4 && nowIdx + k < times.length; k++) {
    const i = nowIdx + k;
    hourly.push({
      hh: hhmm(times[i]),
      tempC: Math.round(raw.hourly.temperature_2m[i]),
      rain: RAIN_CODES.has(raw.hourly.weather_code[i]),
      isNow: k === 0,
    });
  }

  const now = Math.round(raw.current.temperature_2m);

  /**
   * The rest of TODAY, hour by hour.
   *
   * Restricted to the current local date on purpose: `forecast_hours=24` runs
   * past midnight, and an "evening" window matched on hour-of-day alone would
   * happily plan against TOMORROW's 19:00. Comparing the date part of the ISO
   * string is enough — `timezone=auto` puts `current.time` and `hourly.time` on
   * the same local clock.
   */
  const today = nowIso.slice(0, 10);
  const restOfDay: HourCell[] = [];
  for (let i = 0; i < times.length; i++) {
    if (times[i] < nowIso || times[i].slice(0, 10) !== today) continue;
    restOfDay.push({
      hh: hhmm(times[i]),
      tempC: Math.round(raw.hourly.temperature_2m[i]),
      rain: RAIN_CODES.has(raw.hourly.weather_code[i]),
      isNow: restOfDay.length === 0,
    });
  }

  /**
   * The peak and trough STILL AHEAD, not the calendar day's.
   *
   * `daily.temperature_2m_max` covers midnight to midnight, so opening the app
   * at 20:00 would otherwise plan against a 17:00 peak that has already been
   * and gone — the mirror of the bug that put a sweater on a 34.8°C day. The
   * daily block is the fallback for when hourly data is unavailable, and the
   * current reading is the fallback for that.
   */
  const ahead = restOfDay.map((h) => h.tempC);
  const dailyMax = raw.daily?.temperature_2m_max?.[0];
  const dailyMin = raw.daily?.temperature_2m_min?.[0];
  const high = ahead.length ? Math.max(...ahead) : dailyMax == null ? now : Math.round(dailyMax);
  const low = ahead.length ? Math.min(...ahead) : dailyMin == null ? now : Math.round(dailyMin);

  return {
    tempC: now,
    feelsLikeC: Math.round(raw.current.apparent_temperature),
    condition: conditionFor(raw.current.weather_code),
    timezone: raw.timezone,
    hourly,
    restOfDay,
    // Never let the range contradict the reading the user can see on screen.
    highC: Math.max(now, high),
    lowC: Math.min(now, low),
  };
}

export async function fetchForecast(lat: number, lon: number, nowIso?: string) {
  // Round at the boundary: every caller gets a cache-friendly URL, and raw GPS
  // precision never reaches Open-Meteo. timezone=auto makes both `current.time`
  // and `hourly.time` local to the coords (otherwise they come back as GMT).
  const la = roundCoord(lat);
  const lo = roundCoord(lon);
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}` +
    `&current=temperature_2m,apparent_temperature,weather_code` +
    `&hourly=temperature_2m,weather_code,precipitation_probability` +
    // `daily` is what the LOOK is built for; `current` is what the screen shows.
    `&daily=temperature_2m_max,temperature_2m_min` +
    `&forecast_hours=24&forecast_days=1&timezone=auto`;
  const res = await fetch(url, { next: { revalidate: 1800 } });
  return mapForecast(await res.json(), nowIso);
}
