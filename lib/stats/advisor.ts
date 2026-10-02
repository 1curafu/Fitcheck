import { COLORS, COLOR_NAMES, type ColorName } from "@/lib/closet/vocab";
import type { CandidateItem } from "@/lib/generator/candidates";
import { itemBlocked } from "@/lib/generator/nogos";
import { personalBand } from "@/lib/generator/rules";
import type { UiOccasion } from "@/lib/generator/types";
import { pairingRating } from "@/lib/generator/styling/pairing-ratings";
import { candidatesFor, relevantOccasions, type GapPrefs } from "./gap";

export type AdvisorPrefs = GapPrefs & { palette?: string | null; fitPref?: string | null; aesthetic?: string[] };
export const ADVISOR_ARCHETYPES = [
  { category: "Tops", formality: 2, subcategory: "T-shirt", material: "Cotton", texture: "Flat", label: "tshirt" },
  { category: "Tops", formality: 3, subcategory: "Knit", material: "Merino wool", texture: "Fine knit", label: "knit" },
  { category: "Tops", formality: 4, subcategory: "Shirt", material: "Cotton", texture: "Flat", label: "shirt" },
  { category: "Bottoms", formality: 2, subcategory: "Jeans", material: "Denim", texture: "Twill", label: "jeans" },
  { category: "Bottoms", formality: 3, subcategory: "Chinos", material: "Cotton", texture: "Twill", label: "chinos" },
  { category: "Bottoms", formality: 4, subcategory: "Trousers", material: "Wool", texture: "Flat", label: "trousers" },
  { category: "Shoes", formality: 2, subcategory: "Sneakers", material: "Leather", texture: "Flat", label: "sneakers" },
  { category: "Shoes", formality: 4, subcategory: "Loafers", material: "Leather", texture: "Flat", label: "loafers" },
  { category: "Shoes", formality: 5, subcategory: "Oxfords", material: "Leather", texture: "Flat", label: "oxfords" },
  { category: "Outerwear", formality: 2, subcategory: "Jacket", material: "Cotton", texture: "Twill", label: "jacket" },
  { category: "Outerwear", formality: 4, subcategory: "Overcoat", material: "Wool", texture: "Flat", label: "overcoat" },
  { category: "One-piece", formality: 3, subcategory: "Dress", material: "Cotton", texture: "Flat", label: "dayDress" },
  { category: "One-piece", formality: 4, subcategory: "Dress", material: "Wool", texture: "Flat", label: "dress" },
  { category: "Tops", formality: 3, subcategory: "Blouse", material: "Viscose", texture: "Flat", label: "blouse" }, // round2-extended §1
  { category: "Bottoms", formality: 3, subcategory: "Midi skirt", material: "Cotton", texture: "Flat", label: "midiSkirt" }, // outfit-trios:177,179
  { category: "Bottoms", formality: 4, subcategory: "Pencil skirt", material: "Wool", texture: "Flat", label: "pencilSkirt" }, // outfit-trios:148–149
  { category: "Shoes", formality: 3, subcategory: "Ballet flats", material: "Leather", texture: "Flat", label: "balletFlats" }, // round2-extended:17,28
  { category: "Shoes", formality: 4, subcategory: "Block heels", material: "Leather", texture: "Flat", label: "heels" }, // round2-extended:27–28
  { category: "Shoes", formality: 3, subcategory: "Ankle boots", material: "Leather", texture: "Flat", label: "ankleBoots" }, // round2-extended:17–18
] as const;
export type AdvisorPieceKey = typeof ADVISOR_ARCHETYPES[number]["label"];
type Archetype = { category: string; formality: number; subcategory: string; material: string; texture: string; label: AdvisorPieceKey };
export type Purchase = Archetype & { key: string; color: ColorName };

const ALL_OCCASIONS: UiOccasion[] = ["everyday", "work", "weekend", "evening"];
const NEUTRALS: readonly ColorName[] = ["black", "white", "grey", "charcoal", "navy", "cream", "beige", "camel", "brown"];
const SKIRT_FAMILY = new Set<AdvisorPieceKey>(["blouse", "midiSkirt", "pencilSkirt", "balletFlats", "heels"]);
const SKIRT_SIGNAL = /\b(skirts?|blouses?|heels?|pumps?|slingbacks?|ballet|flats?)\b/i;
const COLOUR_NAMES = new Set<string>(COLOR_NAMES);

function frequentColours(closet: readonly CandidateItem[]): ColorName[] {
  const counts = new Map<ColorName, number>();
  for (const item of closet) {
    const color = item.colors[0];
    if (COLOUR_NAMES.has(color)) counts.set(color as ColorName, (counts.get(color as ColorName) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([color]) => color);
}

export function purchaseCandidates(closet: CandidateItem[], prefs?: AdvisorPrefs, archetypes: readonly Archetype[] = ADVISOR_ARCHETYPES): Purchase[] {
  const inferred = closet.some(item => item.category === "One-piece" || SKIRT_SIGNAL.test(item.subcategory ?? ""));
  const allowedCategories = new Set(candidatesFor(closet, prefs).map(item => item.category));
  const rows = archetypes.filter(row => allowedCategories.has(row.category) && (!SKIRT_FAMILY.has(row.label) || inferred));
  const selected = new Set<Archetype>();
  for (const occasion of relevantOccasions(ALL_OCCASIONS, prefs)) {
    const band = personalBand(occasion, prefs ?? null);
    const midpoint = (band[0] + band[1]) / 2;
    for (const category of allowedCategories) {
      const choices = rows.filter(row => row.category === category && row.formality >= band[0] && row.formality <= band[1]);
      const nearest = Math.min(...choices.map(row => Math.abs(row.formality - midpoint)));
      for (const row of choices) if (Math.abs(row.formality - midpoint) === nearest) selected.add(row);
    }
  }
  const top = frequentColours(closet);
  const accents = COLORS.filter(color => !color.neutral && top.filter(c => (pairingRating(color.name, c) ?? 0) >= 4).length >= 2).map(c => c.name);
  const candidates = new Map<string, Purchase>();
  // Colour rounds keep the bounded pool from spending every slot on the first archetype.
  for (const color of ["denim" as const, ...accents, ...NEUTRALS]) {
    for (const row of rows.filter(row => selected.has(row))) {
      if ((row.label === "jeans") !== (color === "denim")) continue;
      if (itemBlocked(row, prefs?.nogos ?? [])) continue;
      if (closet.some(item => item.category === row.category && item.colors[0] === color && Math.abs((item.formality ?? 3) - row.formality) <= 1)) continue;
      const key = `${row.category}|${row.subcategory}|${color}`;
      if (!candidates.has(key)) candidates.set(key, { ...row, key, color });
      if (candidates.size === 80) return [...candidates.values()];
    }
  }
  return [...candidates.values()];
}
