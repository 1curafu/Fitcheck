import { isNeutral } from "@/lib/generator/color";

/**
 * Colour echo: the same accent appearing in more than one garment.
 *
 * ⚠️ THIS INVERTS THE SIGN OF AN EXISTING RULE. `colorHarmonyScore` charges 0.25
 * for every accent past the first, so a shoe whose accent picks up the shirt was
 * PENALISED for the echo — the most reliable move in styling, modelled as a
 * flaw. That is defect #3 of the three behind the reported bad look.
 *
 * The threshold is quantified and comes from two independent streetwear sources
 * that converge: echo in EXACTLY ONE other garment reads intentional; THREE OR
 * MORE echo points read as "forced". The count of echo points is what matters,
 * not the presence of an echo.
 *
 * ⚠️ Only ACCENTS echo. Two white garments is not a styling move, it is just a
 * wardrobe — so neutrals are excluded before counting, or every restrained
 * outfit would score as a deliberate colour story.
 *
 * Returns 0.5 for "no echo", above for a good echo, below for over-matching, so
 * the absence of an echo is neutral rather than a penalty. An outfit with no
 * repeated accent is not doing anything wrong.
 */
export function echoScore(perItemColours: string[][]): number | null {
  if (perItemColours.length < 2) return null;

  const counts = new Map<string, number>();
  for (const item of perItemColours) {
    // Count each colour ONCE per garment: a two-tone shoe listing "sky" twice is
    // not echoing with itself.
    for (const colour of new Set(item.map((c) => c.trim().toLowerCase()))) {
      if (isNeutral(colour)) continue;
      counts.set(colour, (counts.get(colour) ?? 0) + 1);
    }
  }

  // An "echo point" is one accent appearing in one EXTRA garment beyond its first.
  let echoPoints = 0;
  for (const n of counts.values()) if (n > 1) echoPoints += n - 1;

  if (echoPoints === 0) return 0.5;
  if (echoPoints === 1) return 1;
  if (echoPoints === 2) return 0.75; // still readable, past the ideal
  return 0.25; // three or more — "matchy-matchy", the documented failure
}
