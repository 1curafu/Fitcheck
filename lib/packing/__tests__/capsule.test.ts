import { solveCapsule, type CapsuleItem, type TripDay, type OutfitBuilder } from "../capsule";

const closet: CapsuleItem[] = [
  { id: "shirt-a", category: "Tops" },
  { id: "shirt-b", category: "Tops" },
  { id: "tee", category: "Tops" },
  { id: "trouser", category: "Bottoms" },
  { id: "jeans", category: "Bottoms" },
  { id: "loafer", category: "Shoes" },
  { id: "coat", category: "Outerwear" },
];

const days = (n: number, occasion = "work"): TripDay[] =>
  Array.from({ length: n }, (_, i) => ({ date: `2026-05-${12 + i}`, occasion }));

/** Any top + any bottom + any shoe dresses a day, scoring 1. */
const simple: OutfitBuilder = (_day, available) => {
  const top = available.find((i) => i.category === "Tops");
  const bottom = available.find((i) => i.category === "Bottoms");
  const shoe = available.find((i) => i.category === "Shoes");
  if (!top || !bottom || !shoe) return null;
  return { itemIds: [top.id, bottom.id, shoe.id], score: 1 };
};

test("covers every day and reports no shortfall", () => {
  const r = solveCapsule({ closet, days: days(3), level: 3, floor: 0.5, build: simple });
  expect(r.uncovered).toHaveLength(0);
  expect(r.covered).toHaveLength(3);
});

/**
 * The whole point. Three independent outfits would need nine pieces; a capsule
 * re-uses, so three days should cost far fewer.
 */
test("re-uses pieces instead of packing one outfit per day", () => {
  const r = solveCapsule({ closet, days: days(3), level: 3, floor: 0.5, build: simple });
  expect(r.itemIds.length).toBeLessThan(9);
  expect(r.itemIds.length).toBeLessThanOrEqual(5);
});

// ⚠️ The re-wear limit is what forces a second top; without it the solve would
// return one shirt for a whole week and the output would be a lie.
test("respects the re-wear limit by adding another piece", () => {
  const tight = solveCapsule({ closet, days: days(6), level: 2, floor: 0.5, build: simple });
  const tops = tight.itemIds.filter((id) => id.startsWith("shirt") || id === "tee");
  expect(tops.length).toBeGreaterThanOrEqual(3); // 6 days ÷ 2 wears
});

test("a pinned piece is always in the capsule", () => {
  const r = solveCapsule({
    closet, days: days(2), level: 3, floor: 0.5, build: simple, pinned: ["coat"],
  });
  expect(r.itemIds).toContain("coat");
});

test("an excluded piece is never in the capsule", () => {
  const r = solveCapsule({
    closet, days: days(2), level: 3, floor: 0.5, build: simple, excluded: ["loafer"],
  });
  expect(r.itemIds).not.toContain("loafer");
});

/**
 * ⚠️ The shortfall path, which must never be silent. Excluding the only shoe
 * makes every day impossible — the solve says so rather than returning a
 * capsule that cannot dress anyone.
 */
test("reports uncovered days rather than returning a broken capsule", () => {
  const r = solveCapsule({
    closet, days: days(3), level: 3, floor: 0.5, build: simple, excluded: ["loafer"],
  });
  expect(r.uncovered).toHaveLength(3);
  expect(r.covered).toHaveLength(0);
});

// A day whose best outfit scores below the floor is NOT covered — a small
// suitcase bought with a bad Wednesday is not a win.
test("an outfit below the quality floor does not count as covering a day", () => {
  const poor: OutfitBuilder = (d, a) => {
    const r = simple(d, a);
    return r ? { ...r, score: 0.2 } : null;
  };
  const result = solveCapsule({ closet, days: days(2), level: 3, floor: 0.5, build: poor });
  expect(result.uncovered).toHaveLength(2);
});

test("an empty closet covers nothing and does not throw", () => {
  const r = solveCapsule({ closet: [], days: days(2), level: 3, floor: 0.5, build: simple });
  expect(r.itemIds).toEqual([]);
  expect(r.uncovered).toHaveLength(2);
});

test("no days means no capsule", () => {
  const r = solveCapsule({ closet, days: [], level: 3, floor: 0.5, build: simple });
  expect(r.itemIds).toEqual([]);
  expect(r.uncovered).toEqual([]);
});

// Determinism matters: the same trip must not produce a different suitcase on
// a second read. Decision 5's whole premise is that a stored answer is re-read.
test("is deterministic across runs", () => {
  const a = solveCapsule({ closet, days: days(4), level: 3, floor: 0.5, build: simple });
  const b = solveCapsule({ closet, days: days(4), level: 3, floor: 0.5, build: simple });
  expect(a.itemIds).toEqual(b.itemIds);
});

// A piece the solve picked up but never actually wore would be dead weight in
// the suitcase. Only pins earn a place without being worn.
test("never reports a piece it did not wear, unless it was pinned", () => {
  const r = solveCapsule({ closet, days: days(2), level: 3, floor: 0.5, build: simple });
  const wornIds = new Set(r.covered.flatMap((c) => c.itemIds));
  for (const id of r.itemIds) expect(wornIds.has(id)).toBe(true);
});

// Partial coverage is a real state: some days dressed, some not. It must report
// both halves rather than collapsing to all-or-nothing.
test("covers what it can and reports the rest", () => {
  const eveningsOnly: OutfitBuilder = (day, available) =>
    day.occasion === "evening" ? null : simple(day, available);
  const mixed: TripDay[] = [
    { date: "2026-05-12", occasion: "work" },
    { date: "2026-05-13", occasion: "evening" },
    { date: "2026-05-14", occasion: "work" },
  ];
  const r = solveCapsule({ closet, days: mixed, level: 3, floor: 0.5, build: eveningsOnly });
  expect(r.covered).toHaveLength(2);
  expect(r.uncovered).toHaveLength(1);
  expect(r.uncovered[0].occasion).toBe("evening");
});
