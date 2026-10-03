import { COLOR_NAMES } from "@/lib/closet/vocab";
import { SHOE_COLOUR_RULES, shoeColourRule, shoeColourOverrides } from "../shoe-colour";
import { pairingScore, pairingRating } from "../pairing-ratings";
import { colourScore } from "../colour-score";

const RULES = [
  ["black", "navy", "outfit", 0.5], 
  ["brown", "navy", "outfit", 1.0], 
  ["gold", "navy", "outfit", 0.75], 
  ["red", "navy", "outfit", 0.75], 
  ["silver", "navy", "outfit", 0.75], 
  ["black", "olive", "bottoms", 0.25], 
  ["burgundy", "olive", "bottoms", 0.75], 
  ["navy", "olive", "bottoms", 0.75], 
  ["black", "pink", "outfit", 0.75], 
  ["gold", "pink", "outfit", 0.75], 
  ["silver", "pink", "outfit", 0.75], 
  ["beige", "red", "outfit", 0.75], 
  ["black", "red", "outfit", 1.0], 
  ["gold", "red", "outfit", 1.0], 
  ["silver", "red", "outfit", 0.75], 
  ["white", "denim", "bottoms", 1.0], 
  ["white", "grey", "bottoms", 1.0], 
  ["black", "beige", "bottoms", 0.25], 
  ["brown", "charcoal", "outfit", 0.0], 
] as const;

test.each(RULES)("%s shoes against %s %s get the sourced signal", (shoe, withColor, where, value) => {
  const items = [{ category: where === "bottoms" ? "Bottoms" : "Tops", colors: [withColor], formality: 4 },
    { category: "Shoes", colors: [shoe], formality: 4 }];
  expect(shoeColourRule(items)).toBe(value);
  expect([...shoeColourOverrides(items)]).toEqual([[[shoe, withColor].sort().join("|"), value * 4 + 1]]);
});

test("shoe rules never reverse outfit and shoe", () => {
  expect(shoeColourRule([{ category: "Tops", colors: ["brown"] }, { category: "Shoes", colors: ["navy"] }])).toBeNull();
});
test("bottoms rules do not apply to dresses or tops", () => {
  for (const category of ["One-piece", "Tops"]) expect(shoeColourRule([{ category, colors: ["denim"] }, { category: "Shoes", colors: ["white"] }])).toBeNull();
});
test("casual charcoal stays silent, tailoring applies at a mean of four", () => {
  const shoe = { category: "Shoes", colors: ["brown"], formality: 5 };
  expect(shoeColourRule([{ category: "Tops", colors: ["charcoal"], formality: 2 }, shoe])).toBeNull();
  expect(shoeColourRule([{ category: "Tops", colors: ["charcoal"], formality: 3.9 }, shoe])).toBeNull();
  expect(shoeColourRule([{ category: "Tops", colors: ["charcoal"], formality: 3 }, { category: "Bottoms", colors: ["white"], formality: 5 }, shoe])).toBe(0);
  expect(shoeColourRule([{ category: "Tops", colors: ["charcoal"], formality: null }, shoe])).toBeNull();
});
test("only the shoe's primary colour and garments contribute", () => {
  expect(shoeColourRule([{ category: "Accessories", colors: ["red"] }, { category: "Shoes", colors: ["brown", "black"] }])).toBeNull();
  expect(shoeColourRule([{ category: "Tops", colors: ["red"] }, { category: "Shoes", colors: ["brown", "black"] }])).toBeNull();
});
test("matching evidence is averaged once per rule", () => {
  expect(shoeColourRule([{ category: "Tops", colors: ["navy"] }, { category: "Bottoms", colors: ["red", "navy"] }, { category: "Shoes", colors: ["black"] }])).toBe(0.75);
});
test("missing shoes or missing evidence is null", () => {
  expect(shoeColourRule([])).toBeNull();
  expect(shoeColourRule([{ category: "Tops", colors: ["navy"] }])).toBeNull();
  expect(shoeColourRule([{ category: "Tops", colors: ["cream"] }, { category: "Shoes", colors: [] }])).toBeNull();
  expect(shoeColourRule([{ category: "Tops", colors: ["navy"] }, { category: "Shoes" }])).toBeNull();
  expect(shoeColourRule([{ category: "Tops" }, { category: "Shoes", colors: ["white"] }])).toBeNull();
});
test("all rule colours belong to the garment vocabulary", () => {
  for (const rule of SHOE_COLOUR_RULES) { expect(COLOR_NAMES).toContain(rule.shoe); expect(COLOR_NAMES).toContain(rule.with); }
});

test("directional overrides replace one pair and preserve unrelated evidence", () => {
  const overrides = shoeColourOverrides([{ category: "Tops", colors: ["red"] }, { category: "Shoes", colors: ["black"] }]);
  expect([...overrides]).toEqual([["black|red", 5]]);
  expect(pairingScore(["red", "black"], overrides)).toBe(1);
  expect(pairingScore([" RED ", "Black"], overrides)).toBe(1);
  expect(pairingRating(" red ", " BLACK ")).toBe(4);
  expect(pairingScore(["RED", "red", "black", "white"], overrides)).toBeCloseTo((5 + 5 + 4 - 3) / 12, 12);
  expect(pairingScore(["red", "black"])).toBe(0.75);
  expect(pairingScore(["red", "black", "white"], overrides)).toBeCloseTo((5 + 5 + 4 - 3) / 12, 12);
  expect(colourScore([["red"], ["black"]], [], overrides)).toBeGreaterThan(colourScore([["red"], ["black"]]));
});

test("unmatched and casual rules produce no overrides", () => {
  for (const items of [
    [{ category: "Tops", colors: ["brown"] }, { category: "Shoes", colors: ["navy"] }],
    [{ category: "Tops", colors: ["charcoal"], formality: 3.9 }, { category: "Shoes", colors: ["brown"] }],
    [{ category: "One-piece", colors: ["denim"] }, { category: "Shoes", colors: ["white"] }],
  ]) expect(shoeColourOverrides(items).size).toBe(0);
  expect(pairingScore(["purple", "black"], new Map())).toBeNull();
});
