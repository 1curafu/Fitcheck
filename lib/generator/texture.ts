/**
 * Warmth — the signal that decides whether a garment suits today's temperature.
 *
 * The tagger has always written `pattern`, and `texture` arrived with
 * `item-data-completeness`; the generator read neither, so a chunky knit and a
 * fine knit were interchangeable in February. Until now the only thermal read
 * in the product was `seasonFit`, which knows the MONTH, not the weather, and
 * `HOT_MATERIALS`, a keyword list. This module is where warmth becomes real:
 * actual temperature against actual cloth.
 *
 * It is a PREFERENCE. It shifts ranking and can never eliminate a candidate —
 * the same model as outerwear, the colour lean and season, each of which was a
 * hard filter that silently emptied a wardrobe.
 */

/**
 * How the fabric is BUILT.
 *
 * Exported for the vocabulary-drift guard in `__tests__/texture.test.ts`: a
 * value the tagger may emit that is missing here scores 0.5 — indistinguishable
 * from the mid-warmth fabrics genuinely worth 0.5 — so the test checks
 * membership, not the number.
 */
export const TEXTURE_WARMTH: Record<string, number> = {
  "Open knit": 0.15,
  Seersucker: 0.2,
  "Fine knit": 0.25,
  Flat: 0.4,
  Twill: 0.45,
  Herringbone: 0.55,
  Waffle: 0.6,
  Ribbed: 0.6,
  Terry: 0.65,
  Brushed: 0.7,
  "Cable knit": 0.8,
  Quilted: 0.85,
  Pile: 0.85,
  "Chunky knit": 0.9,
  "Fleece-back": 0.9,
};

/**
 * What the fabric IS. Carries the warmth a weave cannot express — tweed is warm
 * however it is woven, linen is cool however it is knitted.
 *
 * `Stainless steel`, `Gold`, `Silver`, `Rubber` and `Other` are deliberately
 * ABSENT: hardware has no thermal opinion, and a value here would make a watch
 * argue about the weather. They fall through to neutral, which is the truth.
 */
export const MATERIAL_WARMTH: Record<string, number> = {
  Linen: 0.15,
  Silk: 0.3,
  Viscose: 0.35,
  Lyocell: 0.35,
  Modal: 0.35,
  Cotton: 0.45,
  Denim: 0.5,
  Canvas: 0.5,
  Nylon: 0.5,
  Polyester: 0.5,
  Leather: 0.55,
  "Faux leather": 0.55,
  Acrylic: 0.6,
  "Merino wool": 0.6,
  // Nap traps air, and it is a cold-season shoe. A small margin over smooth
  // leather on purpose — both are shoes, which barely move the reading anyway.
  Suede: 0.6,
  Wool: 0.65,
  Corduroy: 0.7,
  Cashmere: 0.75,
  Tweed: 0.85,
  Fleece: 0.9,
  Down: 0.95,
  Shearling: 0.95,
};

/**
 * Insulation: warm no matter how it is built, so construction cannot argue it
 * down. This is the set `HOT_MATERIALS` in lib/generator/rules.ts keeps as a
 * hard exclusion; here it also pins the floor of the soft signal.
 */
const INSULATION = new Set(["Fleece", "Down", "Shearling"]);

/** Texture leads, material grounds it. */
const TEXTURE_SHARE = 0.65;

/**
 * 0 = coolest, 1 = warmest, 0.5 = no opinion (untagged or unknown).
 *
 * Reads BOTH dimensions on purpose. Texture alone misses tweed, whose warmth is
 * in the cloth and whose weave a linen shirt also uses. Material alone misses
 * the merino case — a chunky merino knit and a fine merino tee share a fibre and
 * are a season apart. Texture carries the larger share because construction is
 * the stronger signal where both are known, but material sets the floor.
 */
export function itemWarmth(material: string | null, texture: string | null): number {
  const m = material ? MATERIAL_WARMTH[material] : undefined;
  const t = texture ? TEXTURE_WARMTH[texture] : undefined;
  if (m === undefined && t === undefined) return 0.5; // no opinion, never a penalty
  if (t === undefined) return m!;
  if (m === undefined) return t;
  const blended = TEXTURE_SHARE * t + (1 - TEXTURE_SHARE) * m;
  // A fine-knit fleece is still a fleece.
  return material && INSULATION.has(material) ? Math.max(blended, m) : blended;
}

/**
 * How much each slot actually decides whether you are warm.
 *
 * A flat average lets a steel watch and a pair of shoes pull every outfit
 * toward neutral — exactly when the signal should be loudest. Matched by
 * prefix on the lowercased category so DB TitleCase plurals (`Tops`) and the
 * singular fixtures used in scoring tests (`top`) both land.
 */
const CATEGORY_WEIGHT: [string, number][] = [
  ["outerwear", 1.5],
  ["top", 1.2],
  ["bottom", 1],
  ["shoe", 0.6],
  ["accessor", 0.2],
  ["fragrance", 0],
];

function categoryWeight(category?: string | null): number {
  if (!category) return 1; // uncategorised still counts; never silently zeroed
  const c = category.toLowerCase();
  return CATEGORY_WEIGHT.find(([prefix]) => c.startsWith(prefix))?.[1] ?? 1;
}

/**
 * How well a combo's warmth suits the temperature. 0..1, 0.5 = no opinion.
 *
 * `want` maps 25°+ → 0 (want the lightest) and 0° → 1 (want the warmest), and
 * passes through 0.5 at 12.5°.
 *
 * `confidence` is the part that matters and the part a plain `1 - |want - have|`
 * cannot express: that formula's gap between two garments is CONSTANT once
 * `want` sits outside them, so 18° would discriminate exactly as hard as 0°.
 * Fading the whole term toward neutral as the temperature approaches 12.5°
 * gives the intended shape — hardest at the extremes, silent in the middle,
 * where a ribbed knit and a flat shirt are both simply correct and colour,
 * formality and DNA should decide instead.
 */
export function warmthFit(
  items: { category?: string | null; material?: string | null; texture?: string | null }[],
  tempC: number,
): number {
  if (!items.length) return 0.5;
  const want = Math.min(1, Math.max(0, (25 - tempC) / 25));

  let weighted = 0;
  let total = 0;
  for (const i of items) {
    const w = categoryWeight(i.category);
    weighted += w * itemWarmth(i.material ?? null, i.texture ?? null);
    total += w;
  }
  if (total === 0) return 0.5; // nothing in the combo has a thermal say
  const have = weighted / total;

  const confidence = Math.abs(want - 0.5) * 2;
  return 0.5 + confidence * (1 - Math.abs(want - have) - 0.5);
}
