import type { FITS } from "@/lib/ai/tagging-schema";

type Fit = (typeof FITS)[number];

/**
 * The quiz's fit answer (quiz part 2): which garment cuts suit the user's chosen silhouette. Soft only — read by
 * `fitScore` at weight 0.04, and reused by the upcoming wardrobe advisor to choose what cut to recommend.
 */
export type FitPreference = "Tailored" | "Relaxed" | "Oversized";

export const FIT_SUITS: Record<FitPreference, readonly Fit[]> = {
  Tailored: ["Fitted", "Tailored", "Regular"],
  Relaxed: ["Regular", "Relaxed"],
  Oversized: ["Relaxed", "Oversized"],
};

/**
 * The cuts that CLASH with each preference. A cut in neither list is NEUTRAL (half credit): Regular for Oversized,
 * Tailored for Relaxed. The approved table leaves them unlisted on purpose, and scoring them like the opposite cut
 * pushed every Regular-tagged piece (the most common tag) down as hard as a Fitted one (Opus review).
 */
export const FIT_CLASH: Record<FitPreference, readonly Fit[]> = {
  Tailored: ["Relaxed", "Oversized"],
  Relaxed: ["Fitted", "Oversized"],
  Oversized: ["Fitted", "Tailored"],
};

export type FitItem = { category: string; fit?: string | null };

/** Garments worn on the body — the only categories with a cut (shoes and bags have none). */
const CLOTHING = new Set(["Tops", "Bottoms", "One-piece", "Outerwear"]);

const isPreference = (p: string): p is FitPreference => Object.hasOwn(FIT_SUITS, p);

export function fitSuits(itemFit: string, preference: string): boolean {
  return isPreference(preference) && (FIT_SUITS[preference] as readonly string[]).includes(itemFit);
}

/**
 * Mean credit of the look's TAGGED clothing: a cut that suits = 1, a neutral cut = 0.5, a clashing cut = 0. `null` = no
 * opinion (no answer, or nothing tagged), so the term claims no weight.
 */
export function fitScore(items: readonly FitItem[], preference: string | null | undefined): number | null {
  if (!preference || !isPreference(preference)) return null;
  const tagged = items.filter((i) => CLOTHING.has(i.category) && i.fit);
  if (!tagged.length) return null;
  const credit = (fit: string) =>
    fitSuits(fit, preference) ? 1 : (FIT_CLASH[preference] as readonly string[]).includes(fit) ? 0 : 0.5;
  return tagged.reduce((sum, i) => sum + credit(i.fit!), 0) / tagged.length;
}
