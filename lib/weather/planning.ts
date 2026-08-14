import type { HourCell, UiOccasion } from "@/lib/generator/types";

/**
 * Which hours of the day each occasion actually covers.
 *
 * The look is built for the peak of the window it will be WORN in, not for the
 * calendar day's maximum. Without this, an Evening drop generated at 14:00 is
 * planned against the 17:00 afternoon peak — free in August, when 19:00 is
 * still 34°, and badly wrong in October, when a day peaking at 18° is 7° by
 * the time the user goes out.
 *
 * Half-open on the right: `[from, to)`. Hours are local, because the forecast
 * is fetched with `timezone=auto`.
 */
const WINDOWS: Record<UiOccasion, [number, number]> = {
  // The working day, ending when people head home. Beyond it they are dressing
  // for the evening, which has its own occasion.
  work: [0, 19],
  // Out in it for as long as the day lasts.
  everyday: [0, 22],
  weekend: [0, 22],
  // Deliberately does NOT start at 18: an Evening look chosen at 14:00 is worn
  // later, so the afternoon must not set its temperature.
  evening: [18, 24],
};

/** Exported for tests and for anything that needs to explain the choice. */
export function occasionWindow(occasion: UiOccasion): [number, number] {
  return WINDOWS[occasion];
}

function hourOf(cell: HourCell): number {
  return Number(cell.hh.slice(0, 2));
}

/**
 * The temperature this occasion's look should be built for: the warmest hour
 * still ahead that the occasion covers.
 *
 * Warmest rather than mean, for the same reason the day's high beat the current
 * reading — being over-dressed at the peak is the failure users actually feel,
 * and the cool end is handled by `laterAdvice` telling them to take a layer.
 *
 * @param restOfDay today's remaining hours, from `mapForecast`.
 * @param fallbackC used when the window has no hours left at all — a Work look
 * asked for at 21:00, say. Pass the current temperature: planning against an
 * empty window would otherwise be planning against nothing.
 */
export function planningTempFor(
  occasion: UiOccasion,
  restOfDay: HourCell[],
  fallbackC: number,
): number {
  const [from, to] = WINDOWS[occasion];
  const inWindow = restOfDay.filter((h) => hourOf(h) >= from && hourOf(h) < to);
  // An occasion whose window has passed still has to dress the user for the
  // hours that remain — never for a peak that is already behind them.
  const hours = inWindow.length ? inWindow : restOfDay;
  if (!hours.length) return fallbackC;
  return Math.max(...hours.map((h) => h.tempC));
}
