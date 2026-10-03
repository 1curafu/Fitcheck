import { COLORS, COLOR_NAMES, type ColorName } from "@/lib/closet/vocab";
import { buildCandidates, formalityFits, type CandidateItem } from "@/lib/generator/candidates";
import { scoreCombo } from "@/lib/generator/score";
import { QUALITY_FLOOR } from "@/lib/packing/capsule";
import { itemBlocked } from "@/lib/generator/nogos";
import { personalBand } from "@/lib/generator/rules";
import type { UiOccasion } from "@/lib/generator/types";
import { pairingRating } from "@/lib/generator/styling/pairing-ratings";
import { candidatesFor, relevantOccasions, SIMULATED_CONDITIONS, type GapPrefs } from "./gap";

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
  const codeCentre = prefs?.formality_min != null && prefs?.formality_max != null ? (prefs.formality_min + prefs.formality_max) / 2 : 3;
  for (const occasion of relevantOccasions(ALL_OCCASIONS, prefs)) {
    const band = personalBand(occasion, prefs ?? null);
    const midpoint = (band[0] + band[1]) / 2;
    for (const category of allowedCategories) {
      const choices = rows.filter(row => row.category === category && formalityFits(row.formality, row.category, band));
      // Nearest the band's centre; a tie goes to the user's own dress code, so tolerance never decides a purchase.
      const distance = (row: Archetype) => [Math.abs(row.formality - midpoint), Math.abs(row.formality - codeCentre)];
      const best = choices.map(distance).sort((a, b) => a[0] - b[0] || a[1] - b[1])[0];
      for (const row of choices) if (best && distance(row).every((d, i) => d === best[i])) selected.add(row);
    }
  }
  const top = frequentColours(closet);
  const accents = COLORS.filter(color => !color.neutral && top.filter(c => (pairingRating(color.name, c) ?? 0) >= 4).length >= 2).map(c => c.name);
  const candidates = new Map<string, Purchase>();
  // Colour rounds keep the bounded pool from spending every slot on the first archetype; accents and neutrals
  // alternate so neither family can fill all 80 slots before the other is tried (release 0.8.1 review).
  const alternated = Array.from({ length: Math.max(accents.length, NEUTRALS.length) }, (_, i) => [accents[i], NEUTRALS[i]]).flat();
  for (const color of ["denim" as const, ...alternated.filter((c): c is ColorName => c !== undefined)]) {
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

export type Ranked = { purchase: Purchase; pairsWith: number; partners: string[]; best: number };
type ScoredLook = { score: number; ids: string[]; key: string };
const compareLooks = (a: ScoredLook, b: ScoredLook) => b.score - a.score || a.key.localeCompare(b.key);

export function rankPurchases(closet: CandidateItem[], prefs?: AdvisorPrefs, limit = 3): Ranked[] {
  if (limit <= 0) return [];
  const ordered = closet.slice().sort((a, b) => a.id.localeCompare(b.id));
  const ranked: Ranked[] = [];
  const signatures = new Map<CandidateItem, number>();
  const tagIds = new Map<string, number>();
  const scores = new Map<string, { floor: number; full: number }>();
  const signature = (item: CandidateItem) => {
    let value = signatures.get(item);
    if (value === undefined) {
      const tags = JSON.stringify(item, (key, value) => key === "id" ? undefined : value);
      value = tagIds.get(tags);
      if (value === undefined) {
        value = tagIds.size;
        tagIds.set(tags, value);
      }
      signatures.set(item, value);
    }
    return value;
  };
  for (const purchase of purchaseCandidates(ordered, prefs)) {
    const hypothetical: CandidateItem = {
      id: "__buy__", category: purchase.category, colors: [purchase.color], formality: purchase.formality,
      subcategory: purchase.subcategory, material: purchase.material, texture: purchase.texture, pattern: "solid", seasons: [],
    };
    const pool = [...ordered.filter(item => item.category !== purchase.category), hypothetical];
    const partners = new Set<string>();
    const good: ScoredLook[] = [];
    for (const occasion of relevantOccasions(ALL_OCCASIONS, prefs)) {
      const band = personalBand(occasion, prefs ?? null);
      for (const weather of SIMULATED_CONDITIONS) {
        const combos = buildCandidates(pool, { band, weather, excludeItemIds: [], maxAccessories: 0, maxBags: 0, nogos: prefs?.nogos });
        for (const items of combos) {
          if (!items.some(item => item.id === "__buy__")) continue;
          // Scores depend on tags, not ids; identical pieces still count as distinct partners.
          const key = `${band.join(",")}/${weather.tempC}/${items.map(signature).join(",")}`;
          let values = scores.get(key);
          if (!values) {
            const floor = scoreCombo(items, { aesthetic: [], band, tempC: weather.tempC });
            const full = scoreCombo(items, { aesthetic: prefs?.aesthetic ?? [], band, tempC: weather.tempC, palette: prefs?.palette, fitPref: prefs?.fitPref });
            values = { floor, full };
            scores.set(key, values);
          }
          const { floor, full } = values;
          if (floor < QUALITY_FLOOR) continue;
          const ids = items.filter(item => item.id !== "__buy__").map(item => item.id);
          for (const id of ids) partners.add(id);
          const look = { score: full, ids, key: ids.join("|") };
          if (good.length < 5 || compareLooks(look, good[good.length - 1]) < 0) {
            good.push(look);
            good.sort(compareLooks);
            if (good.length > 5) good.pop();
          }
        }
      }
    }
    if (!partners.size) continue;
    ranked.push({ purchase, pairsWith: partners.size, partners: good[0].ids.slice(0, 2), best: good.reduce((sum, look) => sum + look.score, 0) / good.length });
  }
  ranked.sort((a, b) => b.pairsWith - a.pairsWith || b.best - a.best || a.purchase.key.localeCompare(b.purchase.key));
  const counts = new Map<string, number>();
  const selected = ranked.filter(row => {
    const count = counts.get(row.purchase.category) ?? 0;
    if (count >= 2) return false;
    counts.set(row.purchase.category, count + 1);
    return true;
  }).slice(0, limit);
  if (selected.length === 3 && closetRead(ordered).kind !== "colourful"
    && selected.slice(0, 3).every(row => NEUTRALS.includes(row.purchase.color))) {
    const firstTwo = selected.slice(0, 2);
    const accent = ranked.find(row => !NEUTRALS.includes(row.purchase.color)
      && firstTwo.filter(other => other.purchase.category === row.purchase.category).length < 2);
    if (accent) selected[2] = accent;
  }
  return selected;
}

export type ClosetRead = { kind: "neutral" | "mixed" | "colourful"; top: ColorName[] };
const READ_NEUTRALS = new Set<string>([...NEUTRALS, "stone", "sand", "taupe", "khaki", "ivory", "tan", "chocolate", "denim"]);
const GARMENTS = new Set(["Tops", "Bottoms", "One-piece", "Outerwear", "Shoes"]);

/** The share of garments whose main colour is neutral; 1 for an empty closet (no colour to report). */
export function neutralShare(closet: CandidateItem[]): number {
  const garments = closet.filter(item => GARMENTS.has(item.category));
  return garments.length ? garments.filter(item => READ_NEUTRALS.has(item.colors[0])).length / garments.length : 1;
}

export function closetRead(closet: CandidateItem[]): ClosetRead {
  const share = neutralShare(closet);
  const garments = closet.filter(item => GARMENTS.has(item.category));
  return { kind: share >= 0.8 ? "neutral" : share <= 0.6 ? "colourful" : "mixed", top: frequentColours(garments) };
}
