import { canonicalTrio, TRIO_FAMILIES, KNOWN_FAMILIES } from "../trios";

const look = (top: string, bottom: string, shoes: string) => [
  { category: "Tops", colors: [top] },
  { category: "Bottoms", colors: [bottom] },
  { category: "Shoes", colors: [shoes] },
];

test("the research's headline trio is recognised", () => {
  // "White shirt / navy chinos / brown shoes is called out as a universal classic."
  expect(canonicalTrio(look("white", "navy", "brown"))).toBe(1);
});

test("families, not exact colours — an ivory shirt and tan shoes still match", () => {
  // ⚠️ A literal lookup would match almost nothing in a real wardrobe.
  expect(canonicalTrio(look("ivory", "indigo", "chocolate"))).toBe(1);
  expect(canonicalTrio(look("cream", "navy", "caramel"))).toBe(1);
});

test("an unrecognised outfit is NULL, not zero", () => {
  // The table rewards what it knows and stays silent otherwise. A miss must not
  // punish the many fine combinations nobody published.
  expect(canonicalTrio(look("mustard", "purple", "mint"))).toBeNull();
});

test("a one-piece look has no trio to match", () => {
  expect(canonicalTrio([
    { category: "One-piece", colors: ["navy"] },
    { category: "Shoes", colors: ["black"] },
  ])).toBeNull();
});

test("an incomplete look matches nothing", () => {
  expect(canonicalTrio([{ category: "Tops", colors: ["white"] }])).toBeNull();
  expect(canonicalTrio([])).toBeNull();
  // A colour outside the family map contributes nothing.
  expect(canonicalTrio(look("notacolour", "navy", "brown"))).toBeNull();
});

test("every family a row names is reachable from a real palette colour", () => {
  // ⚠️ A row naming a family no colour maps to would be dead weight that can
  // never fire — the trap this project has hit before with unreachable lists.
  for (const family of TRIO_FAMILIES) {
    expect(KNOWN_FAMILIES).toContain(family);
  }
});
