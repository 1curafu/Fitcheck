/**
 * The user's "never put this in a look" answers, as rules.
 *
 * ⚠️ Deliberately NOT in `styling/registry.ts`. Registry HARD rules pass through `relieve()`, which re-admits
 * them when a small closet would otherwise come up empty — right for style advice, wrong for a personal
 * "never". Nothing relieves these; the only exemption is a piece the user asked to style (`keepItemIds`).
 *
 * `NOGO_VALUES` is the ONE vocabulary: the onboarding question builds its chips from it, so the quiz cannot
 * offer a no-go this file does not enforce (`bright` and `square_toe` left the quiz for that reason, 2026-09-30).
 */
export const NOGO_VALUES = ["logos", "skinny", "shorts", "ripped", "double_denim", "graphic"] as const;
export type NoGo = (typeof NOGO_VALUES)[number];

/** The fields the rules read — `CandidateItem` satisfies it structurally. */
export type NoGoItem = {
  category: string;
  subcategory?: string | null;
  fit?: string | null;
  pattern?: string | null;
  branding?: string | null;
  distressing?: string | null;
  material?: string | null;
};

/** `subcategory` is free text written by the tagger in English. */
const SHORTS = /\bshorts?\b/i;
/** Garments worn on the body; denim shoes or a denim bag do not make "double denim". */
const GARMENTS = new Set(["Tops", "Bottoms", "One-piece", "Outerwear"]);

const ITEM_RULES: Record<Exclude<NoGo, "double_denim">, (i: NoGoItem) => boolean> = {
  // "Big logos" in the quiz: a small embroidered mark is not what the user ruled out.
  logos: (i) => i.branding === "Large",
  skinny: (i) => i.category === "Bottoms" && i.fit === "Fitted",
  shorts: (i) => i.category === "Bottoms" && SHORTS.test(i.subcategory ?? ""),
  ripped: (i) => i.distressing === "Ripped",
  graphic: (i) => i.category === "Tops" && i.pattern === "print",
};

export function itemBlocked(item: NoGoItem, nogos: readonly NoGo[]): boolean {
  return nogos.some((n) => n !== "double_denim" && ITEM_RULES[n](item));
}

export function comboBlocked(items: readonly NoGoItem[], nogos: readonly NoGo[]): boolean {
  if (!nogos.includes("double_denim")) return false;
  const denim = items.filter((i) => GARMENTS.has(i.category) && i.material?.toLowerCase() === "denim");
  return denim.length >= 2;
}
