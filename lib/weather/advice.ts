import type { HourCell } from "@/lib/generator/types";
import { formatTemp, type TempUnit } from "./format";

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
 */
export function laterAdvice(
  hourly: HourCell[],
  unit: TempUnit = "C",
): { sentence: string; adviceClause: string } {
  const rainHour = hourly.find((h) => h.rain);
  if (rainHour) {
    const adviceClause = "take a shell.";
    return { sentence: `Rain from ${rainHour.hh} — ${adviceClause}`, adviceClause };
  }

  const now = hourly[0]?.tempC ?? 0;
  const last = hourly[hourly.length - 1]?.tempC ?? now;
  if (now - last >= 5) {
    const adviceClause = "carry a jacket.";
    return { sentence: `Down to ${formatTemp(last, unit)} tonight — ${adviceClause}`, adviceClause };
  }

  const adviceClause = "no extra layer.";
  return { sentence: `Dry through the evening — ${adviceClause}`, adviceClause };
}
