import type { FITS } from "@/lib/ai/tagging-schema";

type Fit = (typeof FITS)[number];

/**
 * The quiz's fit answer (quiz part 2): which garment cuts suit the user's chosen silhouette. Soft only — read by
 * `fitScore` at weight 0.1, and reused by the upcoming wardrobe advisor to choose what cut to recommend.
 */
export type FitPreference = "Tailored" | "Relaxed" | "Oversized";

export const FIT_SUITS: Record<FitPreference, readonly Fit[]> = {
  Tailored: ["Fitted", "Tailored", "Regular"],
  Relaxed: ["Regular", "Relaxed"],
  Oversized: ["Relaxed", "Oversized"],
};

export type FitItem = { category: string; fit?: string | null };

/** Garments worn on the body — the only categories with a cut (shoes and bags have none). */
const CLOTHING = new Set(["Tops", "Bottoms", "One-piece", "Outerwear"]);

const isPreference = (p: string): p is FitPreference => Object.hasOwn(FIT_SUITS, p);

export function fitSuits(itemFit: string, preference: string): boolean {
  return isPreference(preference) && (FIT_SUITS[preference] as readonly string[]).includes(itemFit);
}

/** Share of the look's TAGGED clothing that suits the preference; `null` = no opinion, so the term claims no weight. */
export function fitScore(items: readonly FitItem[], preference: string | null | undefined): number | null {
  if (!preference || !isPreference(preference)) return null;
  const tagged = items.filter((i) => CLOTHING.has(i.category) && i.fit);
  if (!tagged.length) return null;
  return tagged.filter((i) => fitSuits(i.fit!, preference)).length / tagged.length;
}
