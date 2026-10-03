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

/**
 * `subcategory` is free text written by the tagger in English. Plural `shorts` or `bermuda(s)` only: the
 * singular "short" turns up in "Short skirt" and "Short-length trousers", which the user did not rule out.
 */
const SHORTS = /\b(shorts|bermudas?)\b/i;
/** "Graphic tees" means tee-like tops with a print — not a floral blouse or a Hawaiian shirt. */
const TEE_LIKE = /\b(t-?shirts?|tees?|sweatshirts?|hoodies?)\b/i;
/** "Skinny fit" is a trouser cut; a fitted pencil skirt is not what the user ruled out. */
const SKIRT = /\bskirts?\b/i;
/** A print on a tee-like top. Shared with the Streetwear style mark so both mean the same piece. */
export function isGraphicTee(i: NoGoItem): boolean {
  return i.category === "Tops" && i.pattern === "print" && TEE_LIKE.test(i.subcategory ?? "");
}
/** Garments worn on the body; denim shoes or a denim bag do not make "double denim". */
const GARMENTS = new Set(["Tops", "Bottoms", "One-piece", "Outerwear"]);

const ITEM_RULES: Record<Exclude<NoGo, "double_denim">, (i: NoGoItem) => boolean> = {
  // "Big logos" in the quiz: a small embroidered mark is not what the user ruled out.
  logos: (i) => i.branding === "Large",
  skinny: (i) => i.category === "Bottoms" && i.fit === "Fitted" && !SKIRT.test(i.subcategory ?? ""),
  shorts: (i) => i.category === "Bottoms" && SHORTS.test(i.subcategory ?? ""),
  ripped: (i) => i.distressing === "Ripped",
  // A print with no known kind is not evidence of a graphic tee — silence never blocks a piece.
  graphic: isGraphicTee,
};

export function itemBlocked(item: NoGoItem, nogos: readonly NoGo[]): boolean {
  return nogos.some((n) => n !== "double_denim" && ITEM_RULES[n](item));
}

export function comboBlocked(items: readonly NoGoItem[], nogos: readonly NoGo[]): boolean {
  if (!nogos.includes("double_denim")) return false;
  const denim = items.filter((i) => GARMENTS.has(i.category) && i.material?.toLowerCase() === "denim");
  return denim.length >= 2;
}

/**
 * Would any look already STORED for today break a no-go? True when a stored piece is now blocked (its tags were
 * edited, or the no-go was added by a path that does not clear the drop) or a stored look is double denim.
 *
 * Only UNWORN looks count: a worn look is history the user already chose, and rebuilds keep it.
 *
 * The daily action treats `true` like a closet change: the stored set is not served and today's looks are rebuilt
 * for free. A piece that has left the closet is not this function's concern — `reassembleLooks` returns null for it.
 */
export function storedLooksBlocked(
  looks: readonly { worn?: boolean; pieces: readonly { itemId: string }[] }[],
  itemsById: ReadonlyMap<string, NoGoItem>,
  nogos: readonly NoGo[],
  /** Ids exempt from the ITEM rules — the piece a styled look was built around (the user chose it). */
  keepItemIds: readonly string[] = [],
): boolean {
  if (!nogos.length) return false;
  // ⚠️ Worn looks are skipped. They are pinned across rebuilds (`saveDailyLooks` keeps them), so a rebuild
  // cannot remove them — counting them made every later visit rebuild again, spending an AI call each time.
  return looks.some((look) => {
    if (look.worn) return false;
    const present = look.pieces.flatMap((p) => {
      const item = itemsById.get(p.itemId);
      return item ? [{ id: p.itemId, item }] : [];
    });
    const items = present.map((x) => x.item);
    const itemIds = present.map((x) => x.id);
    return items.some((i, idx) => !keepItemIds.includes(itemIds[idx]) && itemBlocked(i, nogos)) || comboBlocked(items, nogos);
  });
}
