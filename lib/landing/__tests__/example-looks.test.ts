import { layoutForLook } from "@/lib/generator/layout";
import { EXAMPLE_CLOSET, EXAMPLE_LOOKS, EXAMPLE_PIECES, exampleLookPieces } from "../example-looks";

test("each example look is a complete outfit placed by the app's own layout", () => {
  for (const look of EXAMPLE_LOOKS) {
    const pieces = exampleLookPieces(look.pieces, (k) => k);
    const categories = pieces.map((p) => p.category);
    for (const needed of ["Tops", "Bottoms", "Shoes"]) expect(categories).toContain(needed);
    expect(pieces.map((p) => p.slot)).toEqual(layoutForLook(pieces));
    expect(pieces.every((p) => p.cutoutUrl.startsWith("/landing/") && p.cutoutUrl.endsWith(".webp"))).toBe(true);
  }
});

test("the watch rides a side rail, as it would in a real drop", () => {
  const watch = exampleLookPieces(EXAMPLE_LOOKS[0].pieces, (k) => k).find((p) => p.itemId === "example-watch")!;
  expect(watch.slot.xPct).toBe(1);
});

test("the example closet holds nine pieces including all of look 01", () => {
  expect(EXAMPLE_CLOSET).toHaveLength(9);
  for (const key of EXAMPLE_LOOKS[0].pieces) expect(EXAMPLE_CLOSET).toContain(key);
  expect(new Set(Object.values(EXAMPLE_PIECES).map((p) => p.src)).size).toBe(Object.keys(EXAMPLE_PIECES).length);
});
