import type { HourCell } from "@/lib/generator/types";
import { OUTERWEAR_C } from "@/lib/generator/rules";
import { formatTemp, type TempUnit } from "./format";

/**
 * How far the day must move before it is worth mentioning. One number for both
 * directions — the same "enough to change what you'd wear" threshold — and
 * Celsius on both sides because it is physics, not a preference.
 */
const SWING_C = 5;

/**
 * The single dressing-advice voice on the screen (README §2). Deterministic.
 * Returns the full `sentence` and the `adviceClause` on its own so the UI can
 * render the clause in rust (README wraps it in #D69873/600).
 *
 * Two rules hold across every branch, and both were learned by getting them
 * wrong on 2026-08-14:
 *
 * 1. **Never tell the user to carry something the look already includes.**
 *    Below `OUTERWEAR_C` the flat-lay has a coat in it, so "carry a jacket"
 *    is the app describing its own picture back at them. The threshold is
 *    IMPORTED from the generator rather than repeated here: two copies of 15
 *    would drift, and the drift would be invisible — the sentence would simply
 *    start disagreeing with the image beside it.
 * 2. **Never reassure the user about a day they are not yet dressed for.** The
 *    look is built for the day's HIGH, so on a cold morning it is deliberately
 *    lighter than the thermometer justifies. That needs an INSTRUCTION ("take a
 *    layer"), not a pat on the back — the reassurance branch shipped first and
 *    was wrong on exactly the mornings the layer advice exists for.
 *
 * @param unit the user's display unit. This sentence is the ONE place a
 * temperature is baked into prose server-side, so it cannot be converted at the
 * render boundary with everything else. The 5° swing that triggers it is still
 * measured in Celsius — the threshold is physics, only the printed number is a
 * preference.
 *
 * @param dayHighC today's high. The generator builds the look for THIS, not for
 * the current temperature (see `planningTemp`), so the gap needs saying out loud.
 * Omitted → every day-aware branch is skipped and the behaviour is exactly what
 * it was before the day-planning change.
 */
export function laterAdvice(
  hourly: HourCell[],
  unit: TempUnit = "C",
  dayHighC?: number,
): { sentence: string; adviceClause: string } {
  const say = (sentence: string, adviceClause: string) => ({
    sentence: `${sentence} — ${adviceClause}`,
    adviceClause,
  });

  // Rain outranks temperature in both directions: wet is the more urgent
  // instruction whether the day is freezing or sweltering.
  const rainHour = hourly.find((h) => h.rain);
  if (rainHour) return say(`Rain from ${rainHour.hh}`, "take a shell.");

  const now = hourly[0]?.tempC ?? 0;
  const last = hourly[hourly.length - 1]?.tempC ?? now;
  const drop = now - last;
  const rise = dayHighC == null ? 0 : dayHighC - now;

  // The look carries a coat, so every clause below is about the cold itself.
  const lookHasCoat = dayHighC != null && dayHighC < OUTERWEAR_C;
  if (lookHasCoat) {
    if (drop >= SWING_C) return say(`Down to ${formatTemp(last, unit)} tonight`, "keep the coat on.");
    return say("Cold through the day", "the coat earns its place.");
  }

  // No coat in the look, and the day still has to climb into what it was built
  // for. This is the instruction half of "dress for the peak" — without it a
  // linen shirt at 6°C reads as the stylist getting it wrong.
  if (rise >= SWING_C && now < OUTERWEAR_C) {
    return say(`Up to ${formatTemp(dayHighC!, unit)} later`, "take a layer for now.");
  }

  // Already warm and climbing: the look is right and the user is in it.
  if (rise >= SWING_C) {
    return say(`Up to ${formatTemp(dayHighC!, unit)} this afternoon`, "you're dressed for it.");
  }

  if (drop >= SWING_C) return say(`Down to ${formatTemp(last, unit)} tonight`, "carry a jacket.");

  return say("Dry through the evening", "no extra layer.");
}
