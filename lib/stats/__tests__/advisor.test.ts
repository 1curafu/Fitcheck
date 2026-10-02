import { MATERIALS, TEXTURES } from "@/lib/closet/vocab";
import type { CandidateItem } from "@/lib/generator/candidates";
import { ADVISOR_ARCHETYPES, purchaseCandidates } from "../advisor";

const piece = (id: string, category: string, color: string, extra: Partial<CandidateItem> = {}): CandidateItem => ({
  id, category, colors: [color], formality: 3, seasons: [], material: "Cotton", texture: "Flat", pattern: "solid", ...extra,
});
const closet = [piece("top", "Tops", "black", { subcategory: "Shirt" }), piece("bottom", "Bottoms", "grey", { subcategory: "Trousers" }),
  piece("shoe", "Shoes", "white", { subcategory: "Sneakers", material: "Leather" })];
const labels = (items: CandidateItem[]) => new Set(purchaseCandidates(items).map(c => c.label));
const family = ["blouse", "midiSkirt", "pencilSkirt", "balletFlats", "heels"] as const;

test("one-piece-only wardrobes need no separate top or bottom; dresses need evidence", () => {
  const candidates = purchaseCandidates([piece("dress", "One-piece", "black"), piece("shoe", "Shoes", "white")]);
  expect(candidates.some(c => c.category === "Tops" || c.category === "Bottoms")).toBe(false);
  expect(candidates.some(c => c.category === "One-piece")).toBe(true);
  expect(purchaseCandidates(closet).some(c => c.category === "One-piece")).toBe(false);
});
test.each(["Dress", "Pleated midi skirt", "Silk blouse", "Block heels", "Ballet flats"])("%s signals the inclusive family", subcategory => {
  const category = subcategory === "Dress" ? "One-piece" : "Bottoms";
  const result = labels([...closet, piece("signal", category, "navy", { subcategory })]);
  for (const label of family) expect(result).toContain(label);
  expect(result).toContain("ankleBoots");
});
test("a trousers-and-shirts closet gets ankle boots, never the inferred family", () => {
  const result = labels(closet);
  for (const label of family) expect(result).not.toContain(label);
  expect(result).toContain("ankleBoots");
});
test("an item-level no-go filters a synthetic shorts archetype through the real rule", () => {
  const shorts = [{ category: "Bottoms", formality: 3, subcategory: "Shorts", material: "Cotton", texture: "Flat", label: "chinos" as const }];
  expect(purchaseCandidates(closet, {}, shorts).length).toBeGreaterThan(0);
  expect(purchaseCandidates(closet, { nogos: ["shorts"] }, shorts)).toEqual([]);
});
test("owned category/primary-colour/formality within one is excluded", () => {
  const candidates = purchaseCandidates(closet);
  expect(candidates.filter(c => c.category === "Tops" && c.color === "black")).toEqual([]);
  expect(candidates.filter(c => c.category === "Bottoms" && c.color === "grey")).toEqual([]);
  expect(candidates.filter(c => c.category === "Shoes" && c.color === "white")).toEqual([]);
  expect(candidates.some(c => c.color === "red")).toBe(true);
});
test("primary colour only determines ownership, with the inclusive formality boundary", () => {
  const list = [{ category: "Tops", formality: 4, subcategory: "Shirt", material: "Cotton", texture: "Flat", label: "shirt" as const }];
  expect(purchaseCandidates([piece("top", "Tops", "black", { colors: ["black", "red"], formality: 3 }), piece("bottom", "Bottoms", "grey")], {}, list).some(c => c.color === "red")).toBe(true);
  expect(purchaseCandidates([piece("top", "Tops", "black", { formality: 2 })], {}, list).some(c => c.color === "black")).toBe(true);
});
test("dress codes are hard and palette stays a preference", () => {
  const prefs = { formality_min: 4, formality_max: 5 };
  const candidates = purchaseCandidates(closet, prefs);
  expect(candidates.length).toBeGreaterThan(0);
  expect(candidates.every(c => c.formality >= 3.5 && c.formality <= 5)).toBe(true);
  expect(purchaseCandidates(closet, { palette: "Neutrals" })).toEqual(purchaseCandidates(closet));
});
test("jeans are denim-only, with no denim proposed for another archetype", () => {
  const candidates = purchaseCandidates(closet);
  expect(candidates.some(c => c.label === "jeans")).toBe(true);
  expect(candidates.filter(c => c.label === "jeans").every(c => c.color === "denim")).toBe(true);
  expect(candidates.filter(c => c.color === "denim").every(c => c.label === "jeans")).toBe(true);
});
test("candidates are unique, at most eighty and stable regardless of closet order", () => {
  const candidates = purchaseCandidates([...closet, piece("dress", "One-piece", "navy")]);
  expect(candidates.length).toBeLessThanOrEqual(80);
  expect(new Set(candidates.map(c => c.key)).size).toBe(candidates.length);
  expect(purchaseCandidates([...closet, piece("dress", "One-piece", "navy")].reverse())).toEqual(candidates);
});
test("every hypothetical material/texture is a valid tag", () => {
  for (const archetype of ADVISOR_ARCHETYPES) {
    expect(MATERIALS).toContain(archetype.material);
    expect(TEXTURES).toContain(archetype.texture);
  }
});
