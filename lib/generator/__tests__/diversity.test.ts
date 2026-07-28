import { diversify } from "../diversity";

const combo = (id: string, top: string, bottom: string, score: number) => ({
  id,
  score,
  items: [
    { id: top, category: "Tops" },
    { id: bottom, category: "Bottoms" },
    { id: "shoe", category: "Shoes" },
  ],
});

// Score order, but the first three all share the cream top — which is exactly
// what a ranked list looks like when one neutral piece harmonises with
// everything. Handing that to the re-ranker guarantees repeats no matter what
// the prompt asks for.
const ranked = [
  combo("a", "cream", "navy", 0.9),
  combo("b", "cream", "stone", 0.89),
  combo("c", "cream", "navy", 0.88),
  combo("d", "navy-top", "stone", 0.8),
  combo("e", "olive-top", "black", 0.7),
];

test("the best-scoring combo is always kept, and kept first", () => {
  expect(diversify(ranked, 3)[0].id).toBe("a");
});

test("no two of the returned looks share a top", () => {
  const tops = diversify(ranked, 3).map((r) => r.items.find((i) => i.category === "Tops")!.id);
  expect(new Set(tops).size).toBe(3);
});

test("no two of the returned looks share a bottom", () => {
  const bottoms = diversify(ranked, 3).map(
    (r) => r.items.find((i) => i.category === "Bottoms")!.id,
  );
  expect(new Set(bottoms).size).toBe(3);
});

test("the diverse set stays in score order", () => {
  const scores = diversify(ranked, 3).map((r) => r.score);
  expect(scores).toEqual([...scores].sort((x, y) => y - x));
});

test("a closet that cannot diversify still returns n, rather than dropping looks", () => {
  // Two tops, two bottoms — three distinct looks are impossible. Repeating a
  // garment beats showing fewer looks, so the shortlist is backfilled.
  const cramped = [
    combo("a", "cream", "navy", 0.9),
    combo("b", "cream", "navy", 0.8),
    combo("c", "cream", "navy", 0.7),
  ];
  expect(diversify(cramped, 3)).toHaveLength(3);
  expect(diversify(cramped, 3)[0].id).toBe("a");
});

test("backfill comes in score order too", () => {
  const cramped = [
    combo("a", "cream", "navy", 0.9),
    combo("b", "cream", "navy", 0.8),
    combo("c", "cream", "navy", 0.7),
  ];
  expect(diversify(cramped, 3).map((r) => r.id)).toEqual(["a", "b", "c"]);
});

test("returns at most n", () => {
  expect(diversify(ranked, 2)).toHaveLength(2);
});

test("a large shortlist is filled to n, not truncated to the distinct few", () => {
  // The fixture has 5 combos; only 3 have a distinct top+bottom (a, d, e).
  // Truncating to those 3 threw away b and c — which are different LOOKS
  // (different bottom, and in a real closet different shoes), not duplicates.
  // buildCandidates never emits the same combination twice, so there is
  // nothing here for the re-ranker to pick twice.
  expect(diversify(ranked, 99)).toHaveLength(5);
});

test("the most-distinct combos come first, so the model's best-3 stay distinct", () => {
  const out = diversify(ranked, 99);
  const tops = out.slice(0, 3).map((r) => r.items.find((i) => i.category === "Tops")!.id);
  expect(new Set(tops).size).toBe(3);
});

test("never returns more than n even when more candidates exist", () => {
  expect(diversify(ranked, 2)).toHaveLength(2);
});

test("an empty ranking returns empty rather than throwing", () => {
  expect(diversify([], 3)).toEqual([]);
});

test("a combo missing a category is not treated as sharing one", () => {
  const shoesOnly = [
    { id: "x", score: 0.9, items: [{ id: "shoe1", category: "Shoes" }] },
    { id: "y", score: 0.8, items: [{ id: "shoe2", category: "Shoes" }] },
  ];
  expect(diversify(shoesOnly, 2)).toHaveLength(2);
});
