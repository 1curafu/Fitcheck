import { soleFormality, soleAgainstTailoring, footwearAgainstOutfit } from "../footwear";

test("the sole ladder runs slim leather down to canvas", () => {
  expect(soleFormality("Leather", "Low profile")).toBeGreaterThan(soleFormality("Canvas", "Chunky"));
});

test("bulk reduces formality even on a leather upper", () => {
  // ⚠️ Bulk is a term in the research's own hierarchy — a double sole reads less
  // formal than a slim one — not a modifier invented here.
  expect(soleFormality("Leather", "Chunky")).toBeLessThan(soleFormality("Leather", "Low profile"));
});

test("an unknown material lands mid-ladder rather than at an extreme", () => {
  const unknown = soleFormality("Moonrock", "Regular");
  expect(unknown).toBeGreaterThan(soleFormality("Canvas", "Chunky"));
  expect(unknown).toBeLessThan(soleFormality("Leather", "Low profile"));
});

test("a chunky canvas sneaker against worsted wool is the research's HARD case", () => {
  const v = soleAgainstTailoring("Canvas", "Chunky", "Wool");
  expect(v.ok).toBe(false);
  expect(v.hard).toBe(true);
});

test("the SAME shoe against linen or cotton is fine", () => {
  // ⚠️ The asymmetry is the whole point: same shoe, opposite verdict, decided by
  // what it is worn WITH rather than by the shoe alone.
  expect(soleAgainstTailoring("Canvas", "Chunky", "Linen").ok).toBe(true);
  expect(soleAgainstTailoring("Canvas", "Chunky", "Cotton").ok).toBe(true);
  expect(soleAgainstTailoring("Canvas", "Chunky", "Denim").ok).toBe(true);
});

test("a leather shoe against wool is never blocked", () => {
  expect(soleAgainstTailoring("Leather", "Low profile", "Wool").ok).toBe(true);
  expect(soleAgainstTailoring("Leather", "Chunky", "Wool").ok).toBe(true);
});

test("a SLIM canvas shoe against wool is a preference, not the hard case", () => {
  const v = soleAgainstTailoring("Canvas", "Low profile", "Wool");
  expect(v.ok).toBe(false);
  expect(v.hard).toBe(false);
});

test("the outfit-level signal is null when there is nothing to judge", () => {
  expect(footwearAgainstOutfit([{ category: "Tops" }])).toBeNull();
  expect(footwearAgainstOutfit([{ category: "Shoes", material: "Canvas" }])).toBeNull();
  expect(footwearAgainstOutfit([])).toBeNull();
});

test("a dress is the counterpart in a one-piece look, as trousers are otherwise", () => {
  const shoe = { category: "Shoes", material: "Canvas", bulk: "Chunky" };
  expect(footwearAgainstOutfit([{ category: "One-piece", material: "Wool" }, shoe]))
    .toBeLessThan(1);
  expect(footwearAgainstOutfit([{ category: "One-piece", material: "Cotton" }, shoe]))
    .toBe(1);
});

test("the hard case scores below the preference case", () => {
  const wool = { category: "Bottoms", material: "Wool" };
  const hard = footwearAgainstOutfit([wool, { category: "Shoes", material: "Canvas", bulk: "Chunky" }])!;
  const soft = footwearAgainstOutfit([wool, { category: "Shoes", material: "Canvas", bulk: "Low profile" }])!;
  expect(hard).toBeLessThan(soft);
  expect(soft).toBeLessThan(1);
});
