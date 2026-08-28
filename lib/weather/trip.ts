import type { Weather } from "@/lib/generator/rules";

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
