import { isNeutral } from "@/lib/generator/color";

/**
 * The part a colour plays ON ONE GARMENT — a property of the garment, never of
 * the colour.
 *
 * ⚠️ **This is the distinction the whole file turns on.** `isNeutral` classifies
 * the COLOUR: it answers "can this anchor an outfit?", which is why
 * `colorHarmonyScore` counts non-neutrals against a three-colour ceiling and why
 * `lib/closet/vocab.ts` marks navy, brown, camel, tan and denim neutral. The
 * role answers a different question — "is this the small colour sitting on top?"
 * The research is positional about it: base colours "sit at the bottom: the
 * jacket and the trousers… and the accent sits on top", and its worked example
 * is "a thread of sky blue in the pocket square picked up by a sky blue shirt".
 * Nothing in it restricts an accent to a non-neutral colour.
 */
export type ColourRole = "dominant" | "accent";

/** One colour as it appears on one garment, with the role it plays there. */
export type ItemColour = { colour: string; role: ColourRole };

/**
 * A garment's colours as the echo model sees them: its dominants plus its
 * accent, each TAGGED with the role it plays.
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
 * ⚠️ It returns role-tagged colours rather than a flat `string[]` because that
 * flattening was itself a defect: it threw the role away one line before the
 * counting needed it, so a navy swoosh became indistinguishable from navy
 * trousers and the echo rule could only ask about the palette. Colours are
 * normalised here (trimmed, lowercased) so every consumer compares like for like.
 *
 * Nothing else about an accent is folded in: it reaches the echo term and no
 * other colour signal. See the contract on `colourScore`.
 */
export function withAccent(colours: string[], accent?: string | null): ItemColour[] {
  const norm = (c: string) => c.trim().toLowerCase();
  const dominants: ItemColour[] = colours.map((c) => ({ colour: norm(c), role: "dominant" }));
  return accent ? [...dominants, { colour: norm(accent), role: "accent" }] : dominants;
}

/**
 * How many GARMENTS each ECHO-ELIGIBLE colour appears in.
 *
 * The one implementation of the counting. `echoScore` weighs it and
 * `echoedAccents` names it, so the score and the sentence shown to the user can
 * never disagree about whether an outfit has a colour story.
 *
 * ⚠️ **Eligibility keys off the ROLE, not only the palette** (changed
 * 2026-09-03). A colour qualifies if it is worn as an ACCENT by at least one
 * garment — whatever the palette calls it — or if it is a non-neutral dominant,
 * as before. The two cases it separates:
 *
 * - navy garment + navy garment → **tonal dressing**. A different mechanism with
 *   its own rule (monochrome wants texture variation), and NOT an echo: two navy
 *   pieces is a wardrobe, not a decision. Still excluded, exactly as before.
 * - navy garment + white sneaker with a navy swoosh → **accent echo**. A human
 *   stylist reads that instantly; the old rule filtered navy out through
 *   `isNeutral` and made the most deliberate thing in the outfit invisible.
 *
 * A neutral dominant may therefore take part in an echo when the OTHER side is
 * an accent, while two neutral dominants alone may not. That asymmetry is the
 * point: one side of the pair has to be a deliberate placement.
 */
function accentCounts(perItem: ItemColour[][]): Map<string, number> {
  // colour -> { garments carrying it, garments carrying it AS AN ACCENT }
  const tallies = new Map<string, { garments: number; asAccent: number }>();
  for (const item of perItem) {
    // Count each colour ONCE per garment: a two-tone shoe listing "sky" twice is
    // not echoing with itself. A colour listed as both a dominant and the accent
    // of the same garment is one occurrence, in the accent role.
    const onThisGarment = new Map<string, boolean>();
    for (const { colour, role } of item) {
      onThisGarment.set(colour, (onThisGarment.get(colour) ?? false) || role === "accent");
    }
    for (const [colour, asAccent] of onThisGarment) {
      const tally = tallies.get(colour) ?? { garments: 0, asAccent: 0 };
      tally.garments += 1;
      if (asAccent) tally.asAccent += 1;
      tallies.set(colour, tally);
    }
  }

  const counts = new Map<string, number>();
  for (const [colour, tally] of tallies) {
    // Neutral AND never placed as an accent — tonal dressing. See above.
    if (isNeutral(colour) && tally.asAccent === 0) continue;
    counts.set(colour, tally.garments);
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
 * Whether the outfit has spent a LOUD colour — one the palette does not treat as
 * a foundation — anywhere, in any role.
 *
 * ⚠️ **Deliberately still a palette question, not a role question.** The 0.35
 * branch below asks "was a statement made that nothing supports?", and a navy
 * logo on a white sneaker is not a statement: it is quiet, which is precisely
 * why `vocab.ts` calls navy neutral. So the REWARD keys off the role (a navy
 * swoosh can echo) while the PENALTY keeps keying off the palette (an
 * unsupported navy swoosh costs nothing). Before 2026-09-03 both questions were
 * answered by the same filter; splitting them is what lets the reward move
 * without dragging the penalty along.
 */
function hasLoudColour(counts: Map<string, number>): boolean {
  return [...counts.keys()].some((colour) => !isNeutral(colour));
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
 * echo-eligible colours carried by more than one garment, at or under
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
export function echoedAccents(perItem: ItemColour[][]): string[] {
  if (perItem.length < 2) return [];
  const counts = accentCounts(perItem);
  if (echoPointsIn(counts) > MAX_REWARDED_ECHO_POINTS) return [];
  return [...counts].filter(([, n]) => n > 1).map(([colour]) => colour);
}

/**
 * Colour echo: the same colour appearing in more than one garment, with at
 * least one of those appearances being a deliberate ACCENT — or, as before, two
 * garments sharing a non-neutral dominant.
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
 * ⚠️ **A colour's palette class and its role on a garment are different things,
 * and this rule keys off the role** (2026-09-03; the open modelling question the
 * previous version of this comment left for the product owner, now answered by
 * them). `lib/closet/vocab.ts` marks navy, brown, camel, tan and denim
 * `neutral: true`, and that classification stays — it is load-bearing for
 * `colorHarmonyScore`'s three-colour ceiling, where treating navy as an accent
 * would wrongly make navy/white/brown read as loud. What changed is that echo no
 * longer borrows that answer for a question it was never asked: a navy swoosh
 * picking up a navy top is an accent echo and is rewarded, while a navy top with
 * navy trousers is tonal dressing and is not. See `accentCounts`.
 *
 * Returns 0.5 for "no echo", above for a good echo, below for over-matching, so
 * the absence of an echo is neutral rather than a penalty. An outfit with no
 * repeated accent is not doing anything wrong.
 */
export function echoScore(perItem: ItemColour[][]): number | null {
  if (perItem.length < 2) return null;

  const counts = accentCounts(perItem);
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
    return hasLoudColour(counts) ? 0.35 : 0.5;
  }
  if (echoPoints === 1) return 1;
  if (echoPoints === MAX_REWARDED_ECHO_POINTS) return 0.75; // still readable, past the ideal
  return 0.25; // three or more — "matchy-matchy", the documented failure
}
