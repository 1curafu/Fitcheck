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
/**
 * How many GARMENTS each non-neutral colour appears in.
 *
 * The one implementation of "what echoes here". `echoScore` weighs it and
 * `echoedAccents` names it, so the score and the sentence shown to the user can
 * never disagree about whether an outfit has a colour story.
 */
function accentCounts(perItemColours: string[][]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of perItemColours) {
    // Count each colour ONCE per garment: a two-tone shoe listing "sky" twice is
    // not echoing with itself.
    for (const colour of new Set(item.map((c) => c.trim().toLowerCase()))) {
      if (isNeutral(colour)) continue;
      counts.set(colour, (counts.get(colour) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * WHICH accents actually echo in this combo — the non-neutral colours carried by
 * more than one garment.
 *
 * ⚠️ Exists because the re-ranker could not infer them. `echoScore` made the
 * echoing combo rank first and the model then discarded it: measured across
 * nine live calls, Haiku never once picked the echoing combo over its
 * identical-but-plain twin, and when merely *encouraged* to look for echoes it
 * invented one that was not there. This is the same fix `DescItem`'s comment
 * records for `pattern` on 2026-08-15 — hand the model the CONCLUSION, not the
 * ingredients. `lib/generator/rerank.ts` prints these on the combo line.
 *
 * Returns [] rather than null for "nothing echoes": a caller asking what echoes
 * wants a list to iterate, and the empty case is not exceptional.
 */
export function echoedAccents(perItemColours: string[][]): string[] {
  if (perItemColours.length < 2) return [];
  return [...accentCounts(perItemColours)].filter(([, n]) => n > 1).map(([colour]) => colour);
}

export function echoScore(perItemColours: string[][]): number | null {
  if (perItemColours.length < 2) return null;

  const counts = accentCounts(perItemColours);

  // An "echo point" is one accent appearing in one EXTRA garment beyond its first.
  let echoPoints = 0;
  for (const n of counts.values()) if (n > 1) echoPoints += n - 1;

  if (echoPoints === 0) {
    // ⚠️ Two DIFFERENT situations both reach zero echo points, and collapsing
    // them was a real defect: an outfit with no accent at all is simply
    // restrained (0.5, no fault), while an outfit carrying an accent that
    // NOTHING else supports has spent a colour for no work. The research:
    // "statement sneakers work best when they connect with one color from the
    // tee, hoodie, jacket, or accessories."
    //
    // Small on purpose. A neutral base plus ONE accent is a legitimate classic
    // structure, not an error — this only breaks a tie between two shoes for
    // the same outfit, and must never outweigh temperature or pairing.
    return counts.size > 0 ? 0.35 : 0.5;
  }
  if (echoPoints === 1) return 1;
  if (echoPoints === 2) return 0.75; // still readable, past the ideal
  return 0.25; // three or more — "matchy-matchy", the documented failure
}
