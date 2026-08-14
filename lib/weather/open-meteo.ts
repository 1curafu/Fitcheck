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

  // The look is built for the day's HIGH, not for the minute the app was
  // opened — the daily drop is generated once and worn all day. Falls back to
  // the current temperature when the API response carries no daily block, which
  // is exactly the behaviour that shipped before.
  const now = Math.round(raw.current.temperature_2m);
  const max = raw.daily?.temperature_2m_max?.[0];
  const min = raw.daily?.temperature_2m_min?.[0];

  return {
    tempC: now,
    feelsLikeC: Math.round(raw.current.apparent_temperature),
    condition: conditionFor(raw.current.weather_code),
    timezone: raw.timezone,
    hourly,
    // Never let the range contradict the reading the user can see on screen.
    highC: max == null ? now : Math.max(now, Math.round(max)),
    lowC: min == null ? now : Math.min(now, Math.round(min)),
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
