import { ARCHETYPE_MARKS, archetypeScore, type ArchetypeItem } from "../archetype";
import { isGraphicTee, itemBlocked } from "../nogos";

const piece = (category: string, extra: Partial<ArchetypeItem> = {}): ArchetypeItem => ({ category, ...extra });
const one = (archetype: string, item: ArchetypeItem) => archetypeScore([item], archetype);

describe("archetype marks (quiz part 3; docs/research/fitcheck-archetype-signals-2026-10-03.csv)", () => {
  test.each([
    ["Old Money", piece("Bottoms", { fit: "Tailored" })],
    ["Old Money", piece("Shoes", { subcategory: "Penny loafers" })],
    ["Old Money", piece("Outerwear", { subcategory: "Navy blazer" })],
    ["Old Money", piece("One-piece", { subcategory: "Shirt dress" })],
    ["Old Money", piece("Tops", { subcategory: "Blouse", material: "Silk" })],
    ["Preppy", piece("Tops", { subcategory: "Oxford shirt" })],
    ["Preppy", piece("Tops", { subcategory: "Polo shirt" })],
    ["Preppy", piece("Tops", { subcategory: "Rugby shirt" })],
    ["Preppy", piece("Tops", { subcategory: "Jumper", texture: "Cable knit" })],
    ["Preppy", piece("Tops", { subcategory: "Cable-knit sweater" })],
    ["Preppy", piece("Tops", { subcategory: "Cableknit jumper" })],
    ["Preppy", piece("Bottoms", { subcategory: "Chinos" })],
    ["Preppy", piece("Shoes", { subcategory: "Boat shoes" })],
    ["Preppy", piece("Shoes", { subcategory: "Loafers" })],
    ["Preppy", piece("Tops", { subcategory: "Argyle vest" })],
    ["Preppy", piece("Bottoms", { subcategory: "Pleated mini skirt" })],
    ["Preppy", piece("Outerwear", { subcategory: "Blazer" })],
    ["Streetwear", piece("Tops", { subcategory: "Hoodie" })],
    ["Streetwear", piece("Bottoms", { subcategory: "Cargo trousers" })],
    ["Streetwear", piece("Tops", { subcategory: "T-shirt", pattern: "print" })],
    ["Streetwear", piece("Shoes", { subcategory: "Sneakers" })],
    ["Streetwear", piece("Tops", { fit: "Oversized" })],
    ["Streetwear", piece("Shoes", { subcategory: "Boots", bulk: "Chunky" })],
  ])("%s signature fires on %o", (archetype, item) => expect(one(archetype, item)).toBe(1));

  test.each([
    piece("Tops", { branding: "Large" }),
    piece("Tops", { fit: "Oversized" }),
    piece("Bottoms", { distressing: "Ripped" }),
    piece("Shoes", { subcategory: "Boots", bulk: "Chunky" }),
    piece("Shoes", { subcategory: "Slides", formality: 1 }),
  ])("Old Money off-style fires on %o", (item) => expect(one("Old Money", item)).toBe(0));

  test.each([
    ["Preppy", piece("Shoes", { subcategory: "Oxford brogues" })], // Oxford SHOES are not an Oxford shirt
    ["Preppy", piece("Bottoms", { subcategory: "Pleated trousers" })], // the research names a pleated SKIRT
    ["Old Money", piece("Bottoms", { fit: "Regular" })], // default cut: no information (spec D6)
    ["Old Money", piece("Tops", { branding: "None" })], // default branding: no information (spec D6)
    ["Old Money", piece("Tops", { subcategory: "Blouse", material: "Cotton" })], // the research names a SILK blouse
    ["Old Money", piece("Shoes", { subcategory: "Derbies", formality: null })], // unknown formality is not gym wear
    ["Streetwear", piece("Bottoms", { fit: "Relaxed" })], // frame.ts precedent (spec D6)
    ["Streetwear", piece("Tops", { subcategory: "Floral blouse", pattern: "print" })], // not a graphic tee
    ["Smart Casual", piece("Bottoms", { fit: "Tailored" })], // no marks at all (spec D4)
    ["Old Money", piece("Bottoms", { subcategory: "Silk blouse trousers", material: "Silk" })], // the silk-blouse mark is a top
    ["Old Money", piece("Tops", { formality: 1 })], // a gym top is not gym footwear
    ["Streetwear", piece("Tops", { bulk: "Chunky" })], // chunky is a sole, not a garment
  ])("%s has no opinion on %o", (archetype, item) => expect(one(archetype, item)).toBeNull());

  test("no answer or an unknown answer is no opinion", () => {
    const tailored = piece("Bottoms", { fit: "Tailored" });
    expect(archetypeScore([tailored], null)).toBeNull();
    expect(archetypeScore([tailored], undefined)).toBeNull();
    expect(archetypeScore([tailored], "smart_casual")).toBeNull();
    expect(archetypeScore([tailored], "Boho")).toBeNull();
    // Object.prototype names must not reach the marks table.
    for (const name of ["constructor", "toString", "__proto__"]) expect(archetypeScore([tailored], name)).toBeNull();
    expect(ARCHETYPE_MARKS["Smart Casual"]).toBeNull();
  });

  test("the value is the share of marks that agree", () => {
    const tailored = piece("Bottoms", { fit: "Tailored" });
    const chunky = piece("Shoes", { subcategory: "Boots", bulk: "Chunky" });
    expect(archetypeScore([tailored, chunky], "Old Money")).toBe(0.5);
    expect(archetypeScore([tailored, piece("Shoes", { subcategory: "Loafers" }), chunky], "Old Money")).toBeCloseTo(2 / 3);
    expect(archetypeScore([piece("Tops", { subcategory: "Knit" })], "Old Money")).toBeNull();
  });

  test("Streetwear and the graphic no-go share one definition of a graphic tee", () => {
    expect(ARCHETYPE_MARKS.Streetwear!.signature).toContain(isGraphicTee);
    for (const tee of [piece("Tops", { subcategory: "T-shirt", pattern: "print" }), piece("Tops", { subcategory: "Floral blouse", pattern: "print" })])
      expect(itemBlocked(tee, ["graphic"])).toBe(isGraphicTee(tee));
  });
});
