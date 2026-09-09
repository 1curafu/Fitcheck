import { soleFormality } from "./styling/footwear";

/**
 * Which styling tradition a combo belongs to.
 *
 * ⚠️ A property of the COMBO, never of the user. One person owns a suit and owns
 * Jordans and wears both; a profile flag would be wrong half the time. This was
 * asked and closed while planning: the onboarding aesthetic does not bias it,
 * even at genuinely ambiguous combos.
 *
 * Signal priority is the research's: footwear is the strongest and is checked
 * first, branding second, proportion third and unreliable. Monochrome is never
 * used standalone in the sources and so is not used here at all.
 */
export type Frame = "classic" | "streetwear";

export type FrameItem = {
  category: string;
  material?: string | null;
  branding?: string | null;
  fit?: string | null;
  formality?: number | null;
  bulk?: string | null;
};

/** Below this a sole is athletic; at or above the upper bound it is a dress shoe. */
const ATHLETIC = 1.5;
const DRESS = 3.5;

export function detectFrame(items: readonly FrameItem[]): Frame {
  // ⚠️ Before every other signal. Streetwear's tier-5 cell is empty — "formal
  // streetwear" in the sources means elevated dressy-casual, not black tie — so
  // once anything here is genuinely formal, the classic rules are the only ones
  // that exist to apply.
  if (items.some((i) => (i.formality ?? 0) >= 5)) return "classic";

  const shoes = items.find((i) => i.category === "Shoes");
  if (shoes) {
    const f = soleFormality(shoes.material, shoes.bulk ?? null);
    if (f <= ATHLETIC) return "streetwear";
    if (f >= DRESS) return "classic";
    // Between the two the shoe genuinely cannot decide — a chunky leather boot
    // reads either way — so fall through to the tie-breakers.
  }

  if (items.some((i) => i.branding === "Large")) return "streetwear";

  // ⚠️ `Oversized` only, though the plan also listed `Relaxed`. Relaxed is the
  // middle of a five-value scale and sits in plenty of classic wardrobes;
  // counting it here would put relaxed chinos and a loafer in the wrong
  // tradition. Only the extreme is a streetwear anchor.
  //
  // Not gated on `fit_source`: the tagger's guess at fit is admittedly weak, but
  // requiring a human answer would leave this branch unreachable for most users,
  // and its downside is bounded — it picks a frame, it never excludes anything.
  if (items.some((i) => i.fit === "Oversized")) return "streetwear";

  return "classic";
}
