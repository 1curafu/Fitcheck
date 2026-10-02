import { MATERIALS, TEXTURES } from "@/lib/closet/vocab";
import type { CandidateItem } from "@/lib/generator/candidates";
import { buildCandidates } from "@/lib/generator/candidates";
import { scoreCombo } from "@/lib/generator/score";
import { personalBand } from "@/lib/generator/rules";
import { relevantOccasions, SIMULATED_CONDITIONS } from "../gap";
import { ADVISOR_ARCHETYPES, purchaseCandidates, rankPurchases, closetRead } from "../advisor";

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

test("a neutral wardrobe gets a researched red purchase among the top three", () => {
  const neutral = [piece("top", "Tops", "white", { formality: 2 }), piece("bottom", "Bottoms", "grey"),
    piece("shoe", "Shoes", "black", { formality: 4, material: "Leather" })];
  const result = rankPurchases(neutral);
  expect(result).toHaveLength(3);
  expect(result.some(row => row.purchase.color === "red")).toBe(true);
  expect(result.some(row => row.purchase.color === "purple")).toBe(false);
  expect(result.slice(0, 2)).toEqual(rankPurchases(neutral, {}, 80).slice(0, 2));
});

test("colourful closets keep their ordinary ranking", () => {
  const colourful = closet.map((item, i) => ({ ...item, colors: [["red", "pink", "navy"][i]] }));
  expect(closetRead(colourful).kind).toBe("colourful");
  expect(rankPurchases(colourful)).toEqual(rankPurchases(colourful, {}, 80).slice(0, 3));
});

test.each([["red", "grey", "white"], ["red", "pink", "white"], ["green", "blue", "white"]])("existing accents and colourful closets keep the first three: %j", (...colors) => {
  const items = closet.map((item, i) => ({ ...item, colors: [colors[i]] }));
  const ordinary = rankPurchases(items, {}, 80).slice(0, 3);
  expect(rankPurchases(items)).toEqual(ordinary);
  expect(new Set(ordinary.map(row => row.purchase.key)).size).toBe(ordinary.length);
});

test("a neutral closet with no qualifying accent keeps neutral suggestions", () => {
  const black = closet.map(item => ({ ...item, colors: ["black"] }));
  const prefs = { formality_min: 4, formality_max: 5 };
  const result = rankPurchases(black, prefs);
  expect(result).toHaveLength(3);
  expect(result).toEqual(rankPurchases(black, prefs, 80).slice(0, 3));
  expect(result.every(row => ["black", "white", "grey", "charcoal", "navy", "cream", "beige", "camel", "brown"].includes(row.purchase.color))).toBe(true);
});

test("counts owned pieces once and names partners from a good look", () => {
  const result = rankPurchases(closet, {}, 80);
  expect(result.length).toBeGreaterThan(0);
  for (const row of result) {
    const possible = closet.filter(item => item.category !== row.purchase.category);
    expect(row.pairsWith).toBeGreaterThan(0);
    expect(row.pairsWith).toBeLessThanOrEqual(possible.length);
    expect(row.best).toBeGreaterThanOrEqual(0.7);
    expect(row.best).toBeLessThanOrEqual(1);
    expect(row.partners.length).toBeGreaterThan(0);
    expect(row.partners.length).toBeLessThanOrEqual(2);
    expect(row.partners.every(id => possible.some(item => item.id === id))).toBe(true);
  }
  const counts = new Map<string, number>();
  for (const row of result) counts.set(row.purchase.category, (counts.get(row.purchase.category) ?? 0) + 1);
  expect([...counts.values()].every(n => n <= 2)).toBe(true);
  expect(result[0].pairsWith).toBe(3);
  for (let i = 1; i < result.length; i++) expect(result[i - 1].pairsWith).toBeGreaterThanOrEqual(result[i].pairsWith);
});

test("the tie-break averages the five best good looks and names the best look's pieces", () => {
  const varied = [...closet, piece("top2", "Tops", "navy", { formality: 4 }),
    piece("bottom2", "Bottoms", "beige", { formality: 2 }), piece("shoe2", "Shoes", "brown", { formality: 4, material: "Leather" })];
  const result = rankPurchases(varied, {}, 80).find(row => row.purchase.category === "Outerwear")!;
  expect(result).toBeDefined();
  const purchase = result.purchase;
  const hypothetical = piece("__buy__", purchase.category, purchase.color, { ...purchase });
  const looks: { score: number; ids: string[] }[] = [];
  for (const occasion of relevantOccasions(["everyday", "work", "weekend", "evening"])) {
    const band = personalBand(occasion, null);
    for (const weather of SIMULATED_CONDITIONS) {
      for (const items of buildCandidates([...varied, hypothetical], { band, weather, excludeItemIds: [], maxAccessories: 0, maxBags: 0 })) {
        if (!items.some(item => item.id === "__buy__")) continue;
        const score = scoreCombo(items, { aesthetic: [], band, tempC: weather.tempC });
        if (score >= 0.7) looks.push({ score, ids: items.filter(item => item.id !== "__buy__").map(item => item.id) });
      }
    }
  }
  expect(looks.length).toBeGreaterThan(5);
  looks.sort((a, b) => b.score - a.score || a.ids.join("|").localeCompare(b.ids.join("|")));
  expect(result.best).toBeCloseTo(looks.slice(0, 5).reduce((sum, look) => sum + look.score, 0) / 5, 12);
  expect(result.partners).toEqual(looks[0].ids.slice(0, 2));
});

test("deterministic ranking honours zero limit and missing wearable partners", () => {
  expect(rankPurchases(closet.slice().reverse())).toEqual(rankPurchases(closet));
  expect(rankPurchases(closet, {}, 0)).toEqual([]);
  expect(rankPurchases([])).toEqual([]);
  const unavailable = closet.map(item => ({ ...item, distressing: "Ripped" }));
  expect(rankPurchases(unavailable, { nogos: ["ripped"] })).toEqual([]);
});

test("capped looks remain deterministic when a large closet arrives in another order", () => {
  const large = Array.from({ length: 90 }, (_, i) => ({ ...closet[i % 3], id: `piece-${i}`, formality: 2 + i % 4,
    colors: [["black", "white", "grey", "navy", "red"][Math.floor(i / 3) % 5]] }));
  expect(rankPurchases(large.slice().reverse())).toEqual(rankPurchases(large));
}, 20000);

test("double denim never counts the owned denim jacket as a jeans partner", () => {
  const jacket = piece("jacket", "Outerwear", "navy", { material: "Denim", subcategory: "Jacket", formality: 2 });
  const result = rankPurchases([...closet, jacket], { nogos: ["double_denim"], formality_min: 2, formality_max: 2 }, 80);
  const jeans = result.filter(row => row.purchase.label === "jeans");
  expect(jeans.length).toBeGreaterThan(0);
  for (const row of jeans) {
    expect(row.pairsWith).toBe(2);
    expect(row.partners).not.toContain("jacket");
  }
});

test("unforced dress looks cannot supply partners for a separate top", () => {
  const dressCloset = [piece("top", "Tops", "black"), piece("dress", "One-piece", "grey"), piece("shoe", "Shoes", "white")];
  expect(rankPurchases(dressCloset, {}, 80).some(row => row.purchase.category === "Tops")).toBe(false);
});

test("clashing looks below the quality floor never count as partners", () => {
  const clashing = closet.map(item => ({ ...item, colors: ["mint", "pink", "yellow", "red", "burgundy", "purple", "green", "teal"], pattern: "print" }));
  const result = rankPurchases(clashing, {}, 80);
  expect(result.length).toBeGreaterThan(0);
  expect(result.every(row => row.best >= 0.7)).toBe(true);
});

test("closet read uses garment primary colours and exact neutral thresholds", () => {
  const garments = (neutral: number, total: number) => Array.from({ length: total }, (_, i) => piece(String(i), "Tops", i < neutral ? "black" : "red"));
  expect(closetRead(garments(8, 10)).kind).toBe("neutral");
  expect(closetRead(garments(7, 10)).kind).toBe("mixed");
  expect(closetRead(garments(6, 10)).kind).toBe("colourful");
  expect(closetRead([...garments(7, 10), ...Array.from({ length: 10 }, (_, i) => piece(`a${i}`, "Accessories", "black"))]).kind).toBe("mixed");
  expect(closetRead(closet).top).toEqual(["black", "grey", "white"]);
});

test("closet colours count frequency, ignore unknown tags, and return only three", () => {
  const colors = ["white", "white", "white", "red", "red", "navy", "black", "unknown"];
  expect(closetRead(colors.map((color, i) => piece(String(i), "Tops", color))).top).toEqual(["white", "red", "black"]);
});

test("archetypes at both dress-code boundaries remain candidates", () => {
  const result = purchaseCandidates(closet, { formality_min: 3.5, formality_max: 3.5 });
  expect(result.some(row => row.label === "knit")).toBe(true);
  expect(result.some(row => row.label === "shirt")).toBe(true);
});

// Instrumented mutation workers measure coverage overhead, not production performance.
test.skipIf(process.env.STRYKER_MUTATOR_WORKER !== undefined)("ranking a real 150-piece synthetic closet stays under 400 ms", () => {
  const large = Array.from({ length: 150 }, (_, i) => ({ ...closet[i % 3], id: `piece-${i}`, colors: [["black", "white", "grey"][Math.floor(i / 3) % 3]] }));
  const start = performance.now();
  const result = rankPurchases(large);
  const elapsed = performance.now() - start;
  expect(result).toHaveLength(3);
  expect(elapsed).toBeLessThan(400);
});
