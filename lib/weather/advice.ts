import type { HourCell } from "@/lib/generator/types";
import { formatTemp, type TempUnit } from "./format";

/**
 * How far the day must still climb before it is worth mentioning. Matches the
 * 5° the evening-drop branch uses — the same "enough to change what you'd wear"
 * threshold, and Celsius on both sides because it is physics, not a preference.
 */
const RISE_C = 5;

/**
 * The single dressing-advice voice on the screen (README §2). Deterministic:
 * rain later → shell; a big evening drop → jacket; else reassuring.
 * Returns the full `sentence` and the `adviceClause` on its own so the UI can
 * render the clause in rust (README wraps it in #D69873/600).
 *
 * @param unit the user's display unit. This sentence is the ONE place a
 * temperature is baked into prose server-side, so it cannot be converted at the
 * render boundary with everything else. The 5° drop that triggers it is still
 * measured in Celsius — the threshold is physics, only the printed number is a
 * preference.
 *
 * @param dayHighC today's high. The generator builds the look for THIS, not for
 * the current temperature, so a steep climb needs saying out loud.
 */
export function laterAdvice(
  hourly: HourCell[],
  unit: TempUnit = "C",
  dayHighC?: number,
): { sentence: string; adviceClause: string } {
  const rainHour = hourly.find((h) => h.rain);
  if (rainHour) {
    const adviceClause = "take a shell.";
    return { sentence: `Rain from ${rainHour.hh} — ${adviceClause}`, adviceClause };
  }

  const now = hourly[0]?.tempC ?? 0;

  // The look is built for the day's HIGH, so on a morning that climbs steeply it
  // will look lighter than the thermometer currently justifies. Say so — this
  // sentence is the ONLY thing that explains why, and without it a light outfit
  // at 20°C reads as the stylist getting it wrong. It is also the other half of
  // the decision: dress for the peak, and be told about the cool start.
  if (dayHighC != null && dayHighC - now >= RISE_C) {
    const adviceClause = "you're dressed for it.";
    return {
      sentence: `Up to ${formatTemp(dayHighC, unit)} this afternoon — ${adviceClause}`,
      adviceClause,
    };
  }

  const last = hourly[hourly.length - 1]?.tempC ?? now;
  if (now - last >= 5) {
    const adviceClause = "carry a jacket.";
    return { sentence: `Down to ${formatTemp(last, unit)} tonight — ${adviceClause}`, adviceClause };
  }

  const adviceClause = "no extra layer.";
  return { sentence: `Dry through the evening — ${adviceClause}`, adviceClause };
}
