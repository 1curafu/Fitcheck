import { temperatureOf } from "./colour-table";

/**
 * How decisively ONE temperature family leads the outfit.
 *
 * The research's most corroborated colour rule — reached independently in both
 * rounds — is that warm and cool may mix but must not split evenly: "one
 * temperature must dominate to keep cohesion," quantified as roughly 70/30.
 *
 * Counts PER GARMENT, not per colour token. `perItemColours` mirrors
 * `echoScore`'s shape for the same reason: a garment is one vote, however many
 * colours it carries. A two-tone shoe (`["white", "sky"]`, both cool) must not
 * cast two cool votes and flip dominance on its own — each garment contributes
 * at most one warm vote and at most one cool vote (one of each, if it genuinely
 * carries both).
 *
 * Returns the dominant side's share, rescaled so a 50/50 split is the
 * "no-opinion" midpoint 0.5 — the same convention `echoScore` uses for "nothing
 * to reward or punish" — and a compliant 70/30 already scores 1.
 *
 * ⚠️ The rescale is FLOORED at 0.5, not at 0. `0.5 + 0.5 * clamp((share - 0.5) /
 * 0.2, 0, 1)` looks like it should just be `(share - 0.5) / 0.2` clamped to
 * [0, 1] — that was the original formula, and it was wrong: with only two
 * temperature-bearing colours the only reachable shares are 0.5 and 1.0, so a
 * flat-0 floor scored an even warm/cool split as MAXIMALLY incoherent — the
 * same 0 as a five-colour clash — while this term still carried 0.30 of the
 * weight. That zeroed pairings the research-backed pairing table rates 5
 * (`camel + navy`, warm+cool, upgraded to 5 because two sources independently
 * call it classic). The research itself frames mixing as a caution ("one side
 * should dominate"), never a ban — same-temperature is "the fastest route to a
 * cohesive look" (reward), a balanced mix is a caution, not a failure on par
 * with genuine clash. This term is a REWARD for temperature dominance, not a
 * punishment for mixing, and 0.5 is where an even split — not wrong, just
 * unremarkable — belongs.
 *
 * ⚠️ Temperature-NEUTRAL colours (taupe, green, pink) are excluded from the
 * count entirely rather than counted as a third side. They lean neither way, so
 * including them would manufacture a split that the eye does not see — and
 * `taupe` in particular is a common trouser colour.
 */
export function temperatureCoherence(perItemColours: string[][]): number | null {
  let warm = 0;
  let cool = 0;
  for (const item of perItemColours) {
    const temps = new Set(item.map((c) => temperatureOf(c)));
    if (temps.has("warm")) warm++;
    if (temps.has("cool")) cool++;
  }
  const total = warm + cool;
  // One side alone is not a mix; there is nothing to be coherent ABOUT.
  if (total < 2) return null;
  const share = Math.max(warm, cool) / total;
  // share runs 0.5 (even) .. 1 (single family). 0.7 is the compliance threshold.
  const dominance = Math.min(1, Math.max(0, (share - 0.5) / 0.2));
  return 0.5 + 0.5 * dominance;
}
