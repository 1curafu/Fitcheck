import type { ColorName } from "@/lib/closet/vocab";

export type ShoeRule = { shoe: ColorName; with: ColorName; where: "outfit" | "bottoms"; minFormality?: number; rating: 1 | 2 | 3 | 4 | 5 };
export const SHOE_COLOUR_RULES: readonly ShoeRule[] = [
  { shoe: "black", with: "navy", where: "outfit", rating: 3 }, // womanandhome.com, esquire.com
  { shoe: "brown", with: "navy", where: "outfit", rating: 5 }, // apetogentleman.com, fashionbeans.com
  { shoe: "gold", with: "navy", where: "outfit", rating: 4 }, // womanandhome.com
  { shoe: "red", with: "navy", where: "outfit", rating: 4 }, // shoe-tease.com
  { shoe: "silver", with: "navy", where: "outfit", rating: 4 }, // womanandhome.com
  { shoe: "black", with: "olive", where: "bottoms", rating: 2 }, // bespokeunit.com
  { shoe: "burgundy", with: "olive", where: "bottoms", rating: 4 }, // bespokeunit.com
  { shoe: "navy", with: "olive", where: "bottoms", rating: 4 }, // bespokeunit.com
  { shoe: "black", with: "pink", where: "outfit", rating: 4 }, // theknot.com
  { shoe: "gold", with: "pink", where: "outfit", rating: 4 }, // theknot.com
  { shoe: "silver", with: "pink", where: "outfit", rating: 4 }, // theknot.com
  { shoe: "beige", with: "red", where: "outfit", rating: 4 }, // shoe-tease.com
  { shoe: "black", with: "red", where: "outfit", rating: 5 }, // theknot.com, thetrendspotter.net
  { shoe: "gold", with: "red", where: "outfit", rating: 5 }, // clarks.com, shoe-tease.com
  { shoe: "silver", with: "red", where: "outfit", rating: 4 }, // shoe-tease.com
  { shoe: "white", with: "denim", where: "bottoms", rating: 5 }, // apetogentleman.com, contrank.com
  { shoe: "white", with: "grey", where: "bottoms", rating: 5 }, // contrank.com, apetogentleman.com
  { shoe: "black", with: "beige", where: "bottoms", rating: 2 }, // apetogentleman.com
  { shoe: "brown", with: "charcoal", where: "outfit", minFormality: 4, rating: 1 }, // permanentstyle.com
];

type Piece = { category: string; colors?: readonly string[]; formality?: number | null };
const GARMENTS = new Set(["Tops", "Bottoms", "One-piece", "Outerwear"]);

function matchingRules(items: readonly Piece[]): readonly ShoeRule[] {
  const shoe = items.find(item => item.category === "Shoes")?.colors?.[0];
  if (!shoe) return [];
  const garments = items.filter(item => GARMENTS.has(item.category));
  if (!garments.length) return [];
  const formality = garments.reduce((sum, item) => sum + (item.formality ?? 3), 0) / garments.length;
  return SHOE_COLOUR_RULES.filter(rule => rule.shoe === shoe
    && (rule.minFormality == null || formality >= rule.minFormality)
    && garments.some(item => (rule.where === "outfit" || item.category === "Bottoms") && item.colors?.includes(rule.with)));
}

export function shoeColourRule(items: readonly Piece[]): number | null {
  const matches = matchingRules(items);
  return matches.length ? matches.reduce((sum, rule) => sum + (rule.rating - 1) / 4, 0) / matches.length : null;
}

/** Matched direction replaces symmetric evidence inside the pairing term. */
export function shoeColourOverrides(items: readonly Piece[]): Map<string, number> {
  return new Map(matchingRules(items).map(rule => [[rule.shoe, rule.with].sort().join("|"), rule.rating]));
}
