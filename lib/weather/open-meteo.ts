import type { HourCell } from "@/lib/generator/types";

export const RAIN_CODES = new Set([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99]);

type Raw = {
  current: { temperature_2m: number; apparent_temperature: number; weather_code: number };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability: number[];
  };
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

/** nowIso is INJECTED (pure) — do not call new Date() here. */
export function mapForecast(
  raw: Raw,
  nowIso: string,
): { tempC: number; feelsLikeC: number; condition: string; hourly: HourCell[] } {
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

  return {
    tempC: Math.round(raw.current.temperature_2m),
    feelsLikeC: Math.round(raw.current.apparent_temperature),
    condition: conditionFor(raw.current.weather_code),
    hourly,
  };
}

export async function fetchForecast(lat: number, lon: number, nowIso: string) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,weather_code` +
    `&hourly=temperature_2m,weather_code,precipitation_probability&forecast_hours=24`;
  const res = await fetch(url, { next: { revalidate: 1800 } });
  return mapForecast(await res.json(), nowIso);
}
