import { temperatureOf } from "./colour-table";

/**
 * How decisively ONE temperature family leads the outfit.
 *
 * The research's most corroborated colour rule — reached independently in both
 * rounds — is that warm and cool may mix but must not split evenly: "one
 * temperature must dominate to keep cohesion," quantified as roughly 70/30.
 *
 * Returns the dominant side's share, rescaled so a 50/50 split scores 0 and a
 * compliant 70/30 already scores 1.
 *
 * ⚠️ The divisor is 0.2, NOT a flat doubling. `(share - 0.5) * 2` looks natural
 * and is wrong: it maps a 70/30 split to 0.4, which PENALISES the very ratio the
 * rule permits. The research names 70/30 as the threshold of compliance, not as
 * the failure case — so 0.7 is where the score should top out, and everything
 * below 0.7 falls away toward an even, incoherent split at 0.5.
 *
 * ⚠️ Temperature-NEUTRAL colours (taupe, green, pink) are excluded from the
 * count entirely rather than counted as a third side. They lean neither way, so
 * including them would manufacture a split that the eye does not see — and
 * `taupe` in particular is a common trouser colour.
 */
export function temperatureCoherence(colours: string[]): number | null {
  let warm = 0;
  let cool = 0;
  for (const c of colours) {
    const t = temperatureOf(c);
    if (t === "warm") warm++;
    else if (t === "cool") cool++;
  }
  const total = warm + cool;
  // One side alone is not a mix; there is nothing to be coherent ABOUT.
  if (total < 2) return null;
  const share = Math.max(warm, cool) / total;
  // share runs 0.5 (even) .. 1 (single family). 0.7 is the compliance threshold.
  return Math.min(1, Math.max(0, (share - 0.5) / 0.2));
}
