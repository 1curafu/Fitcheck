import { colorHex } from "@/lib/closet/vocab";

/**
 * Value contrast: whether the outfit's blocks are distinguishable from one
 * another, judged on the hex the palette already carries.
 *
 * ⚠️ **This exists because pairwise colour averaging cannot see a muddy trio.**
 * Every pair in `camel / beige / camel` is individually pleasant, so the colour
 * model scored it 0.9090 — ABOVE `camel / black / black` at 0.8869, which the
 * research endorses, and exactly level with `navy / white / white`, a classic.
 * Nothing in the scorer could tell those three apart.
 *
 * ⚠️ **CONTRAST RATIO, not luminance difference.** The first design used the
 * difference and it does not work: `camel/beige/camel` spans 0.2749 and
 * `camel/black/black` spans 0.2827 — nearly identical, because a difference
 * treats the dark end of the scale as linear when the eye does not. The WCAG
 * ratio `(L1 + 0.05) / (L2 + 0.05)` puts them at 1.81 and 5.96. Measuring is
 * what caught this; the difference-based version would have shipped scoring the
 * trap and the endorsement the same.
 */

/** WCAG relative luminance, 0 (black) .. 1 (white). */
export function relativeLuminance(hex: string): number | null {
  const h = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = channel(parseInt(h.slice(0, 2), 16));
  const g = channel(parseInt(h.slice(2, 4), 16));
  const b = channel(parseInt(h.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two luminances, 1 (identical) .. 21 (black/white). */
export function contrastRatio(a: number, b: number): number {
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The ratio at which two blocks read as deliberately separated.
 *
 * 3:1 is the WCAG large-text threshold — the standard's own answer to "can a
 * person tell these apart at a glance", which is the same question an outfit
 * asks. Chosen because it is an external landmark rather than a number tuned
 * until the local closet looked right; the `n users` rule forbids the latter.
 */
const CLEAR_SEPARATION = 3;

/**
 * One garment's value, taken from its MOST DOMINANT colour.
 *
 * ⚠️ Dominant, not darkest. The first design took the darkest colour on the
 * theory that the dark block is what the eye reads as the shape — and a test
 * caught it: a two-tone `["white", "sky"]` sneaker then valued as SKY, so it
 * stopped scoring like the same shoe tagged `["white"]` with a sky accent,
 * which is a distinction without a difference. The tagging prompt settles it —
 * `colors` is written "most-dominant first", so the first entry IS the block,
 * and the data already answers the question the heuristic was guessing at.
 *
 * Returns null for a garment carrying no colour the palette knows — hardware,
 * or a colour outside the 42.
 */
function garmentValue(colours: readonly string[]): number | null {
  for (const c of colours) {
    const hex = colorHex(c.trim().toLowerCase());
    const lum = hex ? relativeLuminance(hex) : null;
    if (lum != null) return lum;
  }
  return null;
}

/**
 * How clearly the outfit's garments separate by value, or `null` with nothing
 * to compare.
 *
 * Rises with the strongest contrast present, saturating at `CLEAR_SEPARATION`.
 * Measured on the cases that motivated it:
 *
 *   1.00  all black, all navy      -> 0     (a true tonal column)
 *   1.81  camel / beige / camel    -> 0.40  (the muddy trap)
 *   2.74  white / camel / white    -> 0.87
 *   5.96  camel / black / black    -> 1     (endorsed by the research)
 *  11.88  navy / white / white     -> 1     (a classic)
 *
 * ⚠️ **A score of 0 for a true tonal column is deliberate but INCOMPLETE on its
 * own.** An all-black outfit in one flat weave really is dull; the same outfit
 * in cable knit, twill and suede is not, and telling those apart is what
 * `textureVariety` is for. This term is written to be composed with it, never
 * used alone.
 *
 * ⚠️ Per GARMENT, not per colour token — the shape `temperatureCoherence` and
 * `echoScore` both use. Flattening would let one two-tone shoe manufacture the
 * whole contrast by itself.
 */
export function valueContrast(perItemColours: readonly (readonly string[])[]): number | null {
  const values = perItemColours
    .map(garmentValue)
    .filter((v): v is number => v != null);
  if (values.length < 2) return null;

  let strongest = 1;
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      strongest = Math.max(strongest, contrastRatio(values[i], values[j]));
    }
  }
  const reach = (strongest - 1) / (CLEAR_SEPARATION - 1);
  return Math.min(1, Math.max(0, reach));
}

/**
 * How much VISUAL INTEREST the outfit's surfaces carry, independent of colour.
 *
 * ⚠️ **Texture reached exactly one consumer before this: `itemWarmth`.** So
 * three distinct textures were read purely as "warmer" and COST 0.0099 at 18°C
 * while gaining nothing — measured on `develop`, an all-black outfit in cable
 * knit, twill and suede scored 0.8991 against 0.9090 for the same outfit in
 * three flat weaves. Texture is what rescues a tonal outfit, so being penalised
 * for it is backwards.
 *
 * ⚠️ **`"Flat"` is absence, not a texture.** It is the tagger's default and the
 * value it writes when a surface has nothing to say — the same treatment
 * `patternHarmony` gives `"solid"`. Counting it would make a closet of flat
 * weaves look varied.
 *
 * ⚠️ **Scales rather than gating, and this is a stock decision.** The original
 * design required THREE distinct textures. Measured against the real closet —
 * 21 Flat, 4 Twill, 4 Cable knit, 1 Fine knit — a three-texture look needs the
 * single Fine knit item plus one of each other kind, so the rule would almost
 * never fire. That is the same failure as raising the accessory cap on a closet
 * holding no accessories. Two distinct textures already reads as deliberate.
 */
export function textureVariety(textures: readonly (string | null | undefined)[]): number | null {
  const distinct = new Set(
    textures
      .map((t) => t?.trim().toLowerCase())
      .filter((t): t is string => !!t && t !== "flat"),
  );
  if (!textures.some((t) => t != null)) return null; // nothing tagged at all
  return Math.min(1, distinct.size / 2);
}

/**
 * Whether the outfit's pieces read as separate at all — by VALUE, or failing
 * that by SURFACE.
 *
 * The two are alternatives, not additives: an outfit already separated by value
 * gains nothing from texture, and a tonal column is carried entirely by it.
 * `max` says exactly that, where a sum would double-count a high-contrast
 * outfit that also happens to be textured.
 *
 * This is the signal the research asks for when temperature has nothing to say:
 * "high or low value contrast, material/texture harmony". Since achromatics
 * stopped voting on temperature, that term is `null` for 53% of the real
 * closet's combos, and this is what judges them instead.
 */
export function visualSeparation(
  perItemColours: readonly (readonly string[])[],
  textures: readonly (string | null | undefined)[],
): number | null {
  const value = valueContrast(perItemColours);
  const texture = textureVariety(textures);
  if (value == null && texture == null) return null;
  const separation = Math.max(value ?? 0, texture ?? 0);

  // ⚠️ A clearly separated outfit gets NO OPINION, not a full mark.
  //
  // Scoring it 1.0 looked harmless and was not. 197 of the real closet's 231
  // combos separate cleanly, so the term was very nearly a constant — and a
  // constant is not free here, because combos claim different weight SETS (one
  // carrying two metal items also claims `metalCoordination`). Adding 0.2 at
  // value 1.0 to two looks with different denominators reorders them, and it
  // reordered the top two while saying nothing about either: measured, the
  // camera-bag look rose past the watch-and-bracelet look purely through
  // normalisation, both scoring 1.00 here.
  //
  // Returning null keeps this a signal about the outfits it has something to
  // say about — the muddy and the tonal-flat — and keeps it out of the ranking
  // of the ones it does not. Same contract as `climateFit` and `echoScore`.
  return separation >= 1 ? null : separation;
}
