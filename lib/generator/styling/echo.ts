import { isNeutral } from "@/lib/generator/color";

/**
 * A garment's colours as the echo model sees them: its dominants plus its accent.
 *
 * ⚠️ **The one place `colors` and `accent_color` are combined.** Both the SCORE
 * (`colourScore`, which feeds `echoScore`) and the SENTENCE the model is shown
 * (`echoNote` in lib/generator/rerank.ts) have to assemble this same evidence,
 * and they used to do it with two matching copies of `accent ? [...colours,
 * accent] : colours` — agreeing by coincidence rather than by construction, so
 * a change to either would have silently desynced the sentence from the score.
 * That is the exact class of defect this whole body of work exists to fix, so
 * it is a shared function and not a pair of comments.
 *
 * Nothing else about an accent is folded in here: it reaches the echo term and
 * no other colour signal. See the contract on `colourScore`.
 */
export function withAccent(colours: string[], accent?: string | null): string[] {
  return accent ? [...colours, accent] : colours;
}

/**
 * How many GARMENTS each non-neutral colour appears in.
 *
 * The one implementation of the counting. `echoScore` weighs it and
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

/** An "echo point" is one accent appearing in one EXTRA garment beyond its first. */
function echoPointsIn(counts: Map<string, number>): number {
  let points = 0;
  for (const n of counts.values()) if (n > 1) points += n - 1;
  return points;
}

/**
 * The most echo points an outfit can carry and still be doing something good.
 *
 * Past this it is "matchy-matchy" — the documented failure, scored 0.25 by
 * `echoScore` below. Named rather than inlined because `echoedAccents` must
 * apply the SAME threshold: see the warning there.
 */
const MAX_REWARDED_ECHO_POINTS = 2;

/**
 * WHICH accents echo in this combo, when the echo is the REWARDED kind — the
 * non-neutral colours carried by more than one garment, at or under
 * `MAX_REWARDED_ECHO_POINTS`.
 *
 * ⚠️ Exists because the re-ranker could not infer them. `echoScore` made the
 * echoing combo rank first and the model then discarded it: measured across
 * nine live calls, Haiku never once picked the echoing combo over its
 * identical-but-plain twin, and when merely *encouraged* to look for echoes it
 * invented one that was not there. This is the same fix `DescItem`'s comment
 * records for `pattern` on 2026-08-15 — hand the model the CONCLUSION, not the
 * ingredients. `lib/generator/rerank.ts` prints these on the combo line.
 *
 * ⚠️ **The threshold is why this is not simply "colours in more than one
 * garment".** `echoScore` scores three-or-more echo points at 0.25 — the worst
 * outcome it can return — while the prompt tells the model a stated echo is
 * "worth preferring". An all-rust outfit really does echo, so a note naming it
 * would not be a fabrication; it would be worse than one, because it would
 * advertise precisely what the scorer penalises and the two halves of the same
 * model would be arguing. The note exists to surface a reason to PREFER a
 * combo. Explaining why a combo is BAD is a different feature and would need
 * its own prompt handling.
 *
 * Returns [] rather than null for "nothing echoes": a caller asking what echoes
 * wants a list to iterate, and the empty case is not exceptional.
 */
export function echoedAccents(perItemColours: string[][]): string[] {
  if (perItemColours.length < 2) return [];
  const counts = accentCounts(perItemColours);
  if (echoPointsIn(counts) > MAX_REWARDED_ECHO_POINTS) return [];
  return [...counts].filter(([, n]) => n > 1).map(([colour]) => colour);
}

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
 * ⚠️ **The neutral set therefore BOUNDS this entire rule**, and it is not a
 * neutral list in the ordinary sense: `lib/closet/vocab.ts` marks `navy`,
 * `brown`, `camel`, `tan` and others `neutral: true`. So a navy accent picking
 * up navy trousers produces no reward and no note — it is invisible to echo.
 * Recorded, deliberately not changed here: that classification predates PR #56,
 * when the colour model could only PUNISH, and its meaning changed when the
 * sign inverted. Whether menswear neutrals should still be excluded now that
 * exclusion suppresses a reward is a modelling question for the product owner,
 * not something to settle inside this function.
 *
 * Returns 0.5 for "no echo", above for a good echo, below for over-matching, so
 * the absence of an echo is neutral rather than a penalty. An outfit with no
 * repeated accent is not doing anything wrong.
 */
export function echoScore(perItemColours: string[][]): number | null {
  if (perItemColours.length < 2) return null;

  const counts = accentCounts(perItemColours);
  const echoPoints = echoPointsIn(counts);

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
  if (echoPoints === MAX_REWARDED_ECHO_POINTS) return 0.75; // still readable, past the ideal
  return 0.25; // three or more — "matchy-matchy", the documented failure
}
