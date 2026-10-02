import { OUTERWEAR_C, planningTemp, type Weather } from "@/lib/generator/rules";

/**
 * The provider's forecast horizon. Beyond this it returns nothing, and a trip
 * planned three months out is an ordinary thing to do.
 *
 * ⚠️ **16 → 10 with the OpenWeather swap (2026-08-28).** One Call's
 * `timeline/1day` caps at 10 regardless of `cnt` — measured against the live
 * API, not read off a docs page. So every trip 11–16 days out that previously
 * had a real forecast now falls past the horizon, which makes `beyondHorizon`
 * an ORDINARY case rather than an edge one. It must actually reach the screen.
 */
export const FORECAST_DAYS_MAX = 10;

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

/** At or below this, the night needs something warm even when the day did not (owner: a note, not a packed piece). */
export const COLD_NIGHT_C = 8;

/**
 * The coldest night of a trip whose DAY is mild (high ≥ OUTERWEAR_C) — a colder day already packs a coat (trip-comfort §4).
 * Trips have no hourly forecast, so this is a note to the user rather than an outfit change (owner decision, 2026-10-01).
 */
export function coldNights(byDate: Record<string, Weather>): { lowC: number } | null {
  let coldest: number | null = null;
  for (const w of Object.values(byDate)) {
    if (w.lowC == null) continue;
    if (w.lowC <= COLD_NIGHT_C && planningTemp(w) >= OUTERWEAR_C) coldest = coldest == null ? w.lowC : Math.min(coldest, w.lowC);
  }
  return coldest == null ? null : { lowC: coldest };
}
