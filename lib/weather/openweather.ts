import type { HourCell } from "@/lib/generator/types";
import type { Weather } from "@/lib/generator/rules";
import type { TripForecast } from "./trip";

/**
 * OpenWeather One Call 4.0 — the mapping layer.
 *
 * ⚠️ 4.0 is a RESTRUCTURED API, not a version bump of 3.0. Where 3.0 returned
 * current + hourly + daily in one payload, 4.0 splits them across endpoints:
 *
 *   /data/4.0/onecall/current
 *   /data/4.0/onecall/timeline/1day      ← "1day", NOT "daily"
 *   /data/4.0/onecall/timeline/1h        ← "1h",   NOT "hourly"
 *
 * Guessing `daily`/`hourly` returns a JSON 404 that is indistinguishable from a
 * missing subscription, which is its own trap. See the plan for the full
 * archaeology.
 *
 * ⚠️ Pure mapping only — no `fetch` in this file. That is what makes it testable
 * against captured fixtures, and it is how `open-meteo.ts` is already split.
 */

/**
 * The provider's hard caps, MEASURED against the live API rather than read off a
 * docs page: `cnt` above either value is silently ignored.
 *
 * Both are load-bearing. `DAILY_MAX` is the trip horizon — Open-Meteo gave 16,
 * so trips 11–16 days out newly fall past it and `beyondHorizon` stops being an
 * edge case.
 */
export const DAILY_MAX = 10;

/**
 * ⚠️ 20 hours is SHORTER than a day. Open-Meteo gave 24.
 *
 * So `restOfDay` can end before the day does — open the app around 01:00 and the
 * last few hours of the evening are missing, which slightly weakens the
 * "peak still ahead" high/low and the later-advice line.
 *
 * ⚠️ ACCEPTED DELIBERATELY (user, 2026-08-28) AND MARKED AS CHANGEABLE. The
 * affected window is roughly 00:00–04:00 local, when nobody is choosing an
 * outfit, and the daily block's `temp.max`/`temp.min` remains a sound fallback.
 * **To change it:** page a second batch with `start`/`cnt` (the response carries
 * `prev`/`next` links) at the cost of one more call per city per day. Nothing
 * else in the pipeline needs to change — `restOfDay` simply gets longer.
 */
export const HOURLY_MAX = 20;

/** One entry of a `timeline/*` or `current` response. */
type OwmCell = {
  dt: number;
  temp?: number | { day?: number; min?: number; max?: number };
  feels_like?: number | { day?: number };
  weather?: { id: number; main?: string; description?: string }[];
};

type OwmResponse = {
  timezone?: string;
  timezone_offset?: number;
  data?: OwmCell[];
};

export type OneCallBundle = {
  current: OwmResponse;
  hourly: OwmResponse;
  daily: OwmResponse;
};

/**
 * unix `dt` + `timezone_offset` → the wall clock AT THE LOCATION.
 *
 * ⚠️ The sharpest edge in this swap. Open-Meteo was fetched with
 * `timezone=auto`, so it returned local ISO strings and `open-meteo.ts` could
 * compare them as plain strings. One Call returns UTC epochs plus an offset in
 * seconds, so the local clock has to be derived — and every hour window
 * downstream (`planningTempFor`, `occasionWindow`, `laterAdvice`) reads
 * `HourCell.hh` as a LOCAL hour.
 *
 * Shifting the epoch and then reading it in UTC is what produces the local wall
 * clock; using local `getHours()` would give the SERVER's timezone, which on
 * Vercel is UTC and in the simulator is whatever the laptop is set to.
 */
export function localParts(dt: number, offsetSec: number): { date: string; hh: string; hour: number } {
  const shifted = new Date((dt + offsetSec) * 1000);
  const iso = shifted.toISOString();
  return { date: iso.slice(0, 10), hh: iso.slice(11, 16), hour: shifted.getUTCHours() };
}

/**
 * OpenWeather condition ids: 2xx thunderstorm, 3xx drizzle, 5xx rain, 6xx snow,
 * 7xx atmosphere, 800 clear, 80x cloud.
 *
 * ⚠️ Nothing transfers from Open-Meteo's WMO codes — a silently-empty rain set
 * means the rain guard never fires and nobody notices until it rains.
 *
 * ⚠️ Snow (6xx) is deliberately EXCLUDED, matching what `RAIN_CODES` did: the
 * flag drives "take a shell", which is not the advice for snow. A range test
 * rather than an enumerated set, so a condition id we have never seen cannot
 * slip through as "not rain".
 */
export function isRainId(id: number): boolean {
  const band = Math.floor(id / 100);
  return band === 2 || band === 3 || band === 5;
}

/** Kept to the same four strings the UI already renders and truncates. */
function conditionFor(id: number): string {
  if (isRainId(id)) return "Rain";
  if (id === 800) return "Clear";
  if (id === 801 || id === 802) return "Partly cloudy";
  if (id >= 600 && id < 700) return "Snow";
  return "Overcast";
}

function idOf(cell: OwmCell): number {
  return cell.weather?.[0]?.id ?? 800;
}

function scalarTemp(v: OwmCell["temp"]): number | undefined {
  return typeof v === "number" ? v : v?.day;
}

/**
 * The daily drop's shape, from the three One Call responses.
 *
 * `nowDt` defaults to the `current` record's own timestamp, which is the
 * provider's clock rather than ours — the same choice `open-meteo.ts` made, and
 * the reason both are testable without stubbing time.
 */
export function mapOneCall(
  bundle: OneCallBundle,
  nowDt?: number,
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
  const cur = bundle.current.data?.[0];
  const offset = bundle.current.timezone_offset ?? bundle.hourly.timezone_offset ?? 0;
  const now = nowDt ?? cur?.dt ?? 0;

  const nowC = Math.round(scalarTemp(cur?.temp) ?? 0);
  const cells = bundle.hourly.data ?? [];

  /**
   * The hour CONTAINING now, not the next one. At 07:41 the user is living in
   * the 07:00 cell, and labelling 08:00 as "Now" would be wrong on screen.
   */
  const after = cells.findIndex((c) => c.dt > now);
  const nowIdx = after === -1 ? Math.max(0, cells.length - 1) : Math.max(0, after - 1);

  const toCell = (c: OwmCell, isNow: boolean): HourCell => ({
    hh: localParts(c.dt, offset).hh,
    tempC: Math.round(scalarTemp(c.temp) ?? 0),
    rain: isRainId(idOf(c)),
    isNow,
  });

  const hourly: HourCell[] = [];
  for (let k = 0; k < 4 && nowIdx + k < cells.length; k++) {
    hourly.push(toCell(cells[nowIdx + k], k === 0));
  }

  /**
   * The rest of TODAY, hour by hour.
   *
   * ⚠️ Restricted to the current LOCAL date on purpose. The 20-hour window runs
   * past midnight, and an "evening" window matched on hour-of-day alone would
   * happily plan against TOMORROW's 19:00 — the bug `open-meteo.ts` documents,
   * carried over intact because the hazard is identical.
   */
  const today = cells.length ? localParts(cells[nowIdx].dt, offset).date : "";
  const restOfDay: HourCell[] = [];
  for (let i = nowIdx; i < cells.length; i++) {
    if (localParts(cells[i].dt, offset).date !== today) break;
    restOfDay.push(toCell(cells[i], restOfDay.length === 0));
  }

  /**
   * The peak and trough STILL AHEAD, not the calendar day's — opening the app at
   * 20:00 must not plan against a 17:00 peak that has been and gone.
   */
  const ahead = restOfDay.map((h) => h.tempC);
  const high = ahead.length ? Math.max(...ahead) : nowC;
  const low = ahead.length ? Math.min(...ahead) : nowC;

  return {
    tempC: nowC,
    feelsLikeC: Math.round(
      (typeof cur?.feels_like === "number" ? cur.feels_like : cur?.feels_like?.day) ?? nowC,
    ),
    condition: conditionFor(cur ? idOf(cur) : 800),
    timezone: bundle.current.timezone ?? bundle.hourly.timezone ?? "UTC",
    hourly,
    restOfDay,
    // Never let the range contradict the reading the user can see on screen.
    highC: Math.max(nowC, high),
    lowC: Math.min(nowC, low),
  };
}

/** Map `timeline/1day` into one `Weather` per requested date. */
export function mapOneCallDaily(daily: OwmResponse, dates: string[]): TripForecast {
  const offset = daily.timezone_offset ?? 0;
  const rows = daily.data ?? [];

  const known = new Map<string, Weather>();
  let lastDate = "";
  for (const row of rows) {
    const t = typeof row.temp === "object" ? row.temp : undefined;
    if (t?.max == null || t?.min == null) continue;
    const { date } = localParts(row.dt, offset);
    known.set(date, {
      // The look is built for the day's HIGH — the cold end is handled by
      // advice, not by putting a coat in every flat-lay. Same rule as the drop.
      tempC: Math.round(t.max),
      highC: Math.round(t.max),
      lowC: Math.round(t.min),
      rain: isRainId(idOf(row)),
    });
    lastDate = date;
  }

  const byDate: Record<string, Weather> = {};
  let beyondHorizon = false;
  // The furthest day we actually have — the nearest real data rather than an
  // invented average, for anything past the horizon.
  const lastKnown = lastDate ? known.get(lastDate) : undefined;

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
