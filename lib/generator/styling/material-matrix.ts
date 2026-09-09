/**
 * Rated material and texture pairings, with the REASON attached.
 *
 * Colour got rated pairings in `pairing-ratings.ts`; material and texture never
 * did. Until now `material` reached exactly three consumers — rain exclusion,
 * warmth, and hardware detection — and nothing rated one material against
 * another. Linen with tweed, silk with fleece, wool with technical nylon: the
 * engine had no opinion at all.
 *
 * ⚠️ The reason code is not decoration. It is what lets the re-ranker say WHY a
 * combination was demoted — "linen and fleece contradict each other
 * climatically" is a sentence a wearer learns from, "rated 1" is not. It also
 * makes a wrong rating diagnosable: a mis-tagged SEA is a different bug from a
 * mis-tagged FORM.
 *
 * ⚠️ Ratings compare TWO SEPARATE GARMENTS, never a fibre blend inside one.
 * `items.material` is the dominant fibre of one piece, which is exactly the unit
 * these ratings are about.
 *
 * ⚠️ Absent means UNRESEARCHED, not neutral — the same contract
 * `pairing-ratings.ts` follows. An unrated pair returns null and the caller
 * drops the term rather than inventing a midpoint.
 */

/**
 * SEA season conflict · FORM formality/register conflict · WT weight/bulk
 * conflict · SHN sheen/finish conflict · TX same-but-different clash ·
 * CPX deliberate contrast, the one POSITIVE code.
 */
export type ReasonCode = "SEA" | "FORM" | "WT" | "SHN" | "TX" | "CPX";
type Pairing = { rating: number; codes: ReasonCode[] };

export const MATERIAL_PAIRINGS: Record<string, Pairing> = {
  // Linen — the clearest season signal in the matrix.
  "Faux leather|Linen": { rating: 2, codes: ["SEA", "WT"] },
  "Fleece|Linen": { rating: 1, codes: ["SEA"] },
  "Linen|Shearling": { rating: 1, codes: ["SEA", "WT"] },
  "Down|Linen": { rating: 1, codes: ["SEA", "WT"] },
  "Linen|Polyester": { rating: 3, codes: [] },
  "Linen|Nylon": { rating: 2, codes: ["SEA"] },
  "Acrylic|Linen": { rating: 1, codes: ["SEA"] },
  // Silk — formality and sheen do the work.
  "Faux leather|Silk": { rating: 4, codes: ["CPX"] },
  "Fleece|Silk": { rating: 1, codes: ["FORM", "WT"] },
  "Shearling|Silk": { rating: 3, codes: ["CPX"] },
  "Down|Silk": { rating: 1, codes: ["FORM", "WT"] },
  "Polyester|Silk": { rating: 2, codes: ["SHN"] },
  "Nylon|Silk": { rating: 1, codes: ["FORM", "SHN"] },
  "Acrylic|Silk": { rating: 1, codes: ["FORM"] },
  "Leather|Silk": { rating: 4, codes: ["CPX"] },
  // Cotton and canvas — the permissive middle.
  "Cotton|Faux leather": { rating: 4, codes: ["CPX"] },
  "Cotton|Fleece": { rating: 3, codes: [] },
  "Cotton|Shearling": { rating: 3, codes: [] },
  "Canvas|Shearling": { rating: 4, codes: ["CPX"] },
  // Denim.
  "Denim|Fleece": { rating: 4, codes: ["CPX"] },
  "Denim|Shearling": { rating: 4, codes: ["CPX"] },
  // Tweed — rustic and single-register, so it clashes harder than plain wool.
  "Faux leather|Tweed": { rating: 2, codes: ["FORM", "SHN"] },
  "Fleece|Tweed": { rating: 1, codes: ["FORM", "WT"] },
  "Down|Tweed": { rating: 1, codes: ["FORM", "WT"] },
  "Nylon|Tweed": { rating: 1, codes: ["FORM", "WT"] },
  "Acrylic|Tweed": { rating: 2, codes: ["FORM"] },
  "Shearling|Tweed": { rating: 3, codes: ["WT"] },
  // Wool tailoring.
  "Fleece|Wool": { rating: 2, codes: ["FORM"] },
  "Nylon|Wool": { rating: 2, codes: ["FORM"] },
  "Acrylic|Wool": { rating: 2, codes: ["FORM"] },
  // ⚠️ Cashmere+Nylon is 3, NOT 1 — the one technical pairing with actual
  // trend-press backing ("quiet outdoor"), deliberately above wool+nylon.
  "Cashmere|Nylon": { rating: 3, codes: ["FORM"] },
  "Cashmere|Fleece": { rating: 1, codes: ["FORM"] },
  "Acrylic|Cashmere": { rating: 1, codes: ["FORM"] },
  "Cashmere|Polyester": { rating: 2, codes: ["FORM"] },
  "Merino wool|Nylon": { rating: 4, codes: ["CPX"] },
  "Faux leather|Merino wool": { rating: 4, codes: [] },
  // Leather and suede.
  "Leather|Nylon": { rating: 3, codes: ["CPX"] },
  "Leather|Shearling": { rating: 3, codes: ["CPX"] },
  "Leather|Polyester": { rating: 2, codes: ["FORM"] },
  // ⚠️ Real next to faux reads as an odd near-miss — the same-but-different
  // clash, flagged in the research as inference rather than a sourced claim.
  "Faux leather|Leather": { rating: 2, codes: ["TX"] },
  "Faux leather|Suede": { rating: 2, codes: ["TX"] },
  "Nylon|Suede": { rating: 2, codes: ["TX"] },
  "Shearling|Suede": { rating: 3, codes: ["CPX"] },
  "Corduroy|Nylon": { rating: 2, codes: ["TX"] },
  // Drape against structure — a positive mechanic.
  "Cotton|Viscose": { rating: 4, codes: ["CPX"] },
  "Linen|Viscose": { rating: 4, codes: ["CPX"] },
  "Denim|Viscose": { rating: 4, codes: ["CPX"] },
  "Viscose|Wool": { rating: 3, codes: ["CPX"] },
  "Cotton|Modal": { rating: 4, codes: ["CPX"] },
  "Cotton|Lyocell": { rating: 4, codes: ["CPX"] },
  "Denim|Lyocell": { rating: 4, codes: ["CPX"] },
};

export const TEXTURE_PAIRINGS: Record<string, Pairing> = {
  "Cable knit|Flat": { rating: 4, codes: ["CPX"] },
  "Fine knit|Quilted": { rating: 4, codes: ["CPX"] },
  "Chunky knit|Quilted": { rating: 2, codes: ["WT"] },
  "Brushed|Quilted": { rating: 4, codes: ["CPX"] },
  "Flat|Terry": { rating: 3, codes: ["FORM"] },
  "Terry|Twill": { rating: 3, codes: ["FORM"] },
  "Flat|Waffle": { rating: 4, codes: ["CPX"] },
  "Ribbed|Waffle": { rating: 4, codes: ["CPX"] },
  "Pile|Pile": { rating: 4, codes: ["CPX"] },
  "Fleece-back|Flat": { rating: 4, codes: [] },
  "Flat|Twill": { rating: 4, codes: [] },
  "Flat|Open knit": { rating: 3, codes: [] },
  // ⚠️ Same-value keys on purpose: the research's rule is that two SIMILAR
  // textures compound where two different ones do not.
  "Chunky knit|Chunky knit": { rating: 1, codes: ["WT"] },
  "Herringbone|Herringbone": { rating: 2, codes: ["TX"] },
  // Seersucker's whole function is holding cloth off the body — the opposite of
  // what a heavy winter texture is for.
  "Quilted|Seersucker": { rating: 1, codes: ["SEA", "WT"] },
  "Chunky knit|Seersucker": { rating: 1, codes: ["SEA", "WT"] },
};

function key(a: string, b: string): string {
  return [a.trim(), b.trim()].sort().join("|");
}

export function materialPairing(a: string, b: string): Pairing | null {
  return MATERIAL_PAIRINGS[key(a, b)] ?? null;
}
export function texturePairing(a: string, b: string): Pairing | null {
  return TEXTURE_PAIRINGS[key(a, b)] ?? null;
}

/**
 * ⚠️ Deliberately does NOT de-duplicate its input, which is a departure from
 * `pairingScore`'s colour equivalent.
 *
 * The plan specified de-duplication, and it would have made two rows —
 * `Chunky knit|Chunky knit` and `Herringbone|Herringbone` — impossible to reach
 * through this function: rules that can never fire, the trap this codebase has
 * hit before with unreachable lists. Two chunky knits in one outfit is exactly
 * the compounding the research warns about, so the caller passes one value PER
 * GARMENT and a repeated value is a real pair.
 */
function meanRating(
  values: readonly (string | null | undefined)[],
  lookup: (a: string, b: string) => Pairing | null,
): number | null {
  const present = values.filter((v): v is string => !!v);
  const rated: number[] = [];
  for (let i = 0; i < present.length; i++) {
    for (let j = i + 1; j < present.length; j++) {
      const p = lookup(present[i], present[j]);
      if (p) rated.push(p.rating);
    }
  }
  if (!rated.length) return null;
  // 1..5 → 0..1, matching how `pairingScore` normalises its colour ratings.
  return rated.reduce((x, y) => x + y, 0) / rated.length / 5;
}

export function materialScore(materials: readonly (string | null | undefined)[]): number | null {
  return meanRating(materials, materialPairing);
}
export function textureScore(textures: readonly (string | null | undefined)[]): number | null {
  return meanRating(textures, texturePairing);
}

/** Every reason code a combo triggered — raw material for the "why" sentence. */
export function pairingReasons(
  materials: readonly (string | null | undefined)[],
  textures: readonly (string | null | undefined)[],
): ReasonCode[] {
  const codes = new Set<ReasonCode>();
  const collect = (
    values: readonly (string | null | undefined)[],
    lookup: (a: string, b: string) => Pairing | null,
  ) => {
    const present = values.filter((v): v is string => !!v);
    for (let i = 0; i < present.length; i++) {
      for (let j = i + 1; j < present.length; j++) {
        for (const c of lookup(present[i], present[j])?.codes ?? []) codes.add(c);
      }
    }
  };
  collect(materials, materialPairing);
  collect(textures, texturePairing);
  return [...codes];
}
