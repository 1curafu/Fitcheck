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
 * ⚠️ **This builder exists because the obvious test was a tautology.**
 *
 * `simple` always returns the FIRST matching item, so it hands back the same
 * pieces whether it is given the chosen subset or the whole closet — which
 * meant "re-uses pieces" passed even with re-use deliberately broken. Caught by
 * the negative pass, and the same shape as the `gap === null || gap.unlocks > 0`
 * tautology this project shipped once before.
 *
 * This one rotates its pick by day, so given the whole closet it chooses a
 * DIFFERENT top every day. Only a solve that genuinely prefers what it already
 * has will keep the capsule small.
 */
const rotating: OutfitBuilder = (day, available) => {
  const nth = Number(day.date.slice(-2));
  const pick = (category: string) => {
    const options = available.filter((i) => i.category === category);
    return options.length ? options[nth % options.length] : null;
  };
  const top = pick("Tops");
  const bottom = pick("Bottoms");
  const shoe = pick("Shoes");
  if (!top || !bottom || !shoe) return null;
  return { itemIds: [top.id, bottom.id, shoe.id], score: 1 };
};

/**
 * The whole point. Three independent outfits would need nine pieces; a capsule
 * re-uses, so three days should cost far fewer.
 */
test("re-uses pieces instead of packing one outfit per day", () => {
  const r = solveCapsule({ closet, days: days(3), level: 3, floor: 0.5, build: rotating });
  expect(r.itemIds.length).toBeLessThan(9);
  expect(r.itemIds.length).toBeLessThanOrEqual(5);
});

// The same property stated as a guarantee rather than a bound: a builder that
// would happily pick a fresh top every day must still yield ONE top, because
// the solve asks the chosen set first.
test("prefers what is already packed over something new", () => {
  const r = solveCapsule({ closet, days: days(3), level: 3, floor: 0.5, build: rotating });
  const tops = r.itemIds.filter((id) => id.startsWith("shirt") || id === "tee");
  expect(tops).toHaveLength(1);
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

/**
 * ⚠️ Day-to-day variety, and the guarantee that it is FREE.
 *
 * A capsule's promise is re-use, so a variety preference that could make the
 * solve buy another piece would fight the feature. The engine only offers
 * `recent` on the branch where nothing can be bought.
 */
describe("variety across consecutive days", () => {
  // A builder that respects `recent`: it avoids repeating the previous day's
  // top when it has another to hand — what `rankTopN`'s recency weight does.
  const varying: OutfitBuilder = (_day, available, recent) => {
    const avoid = new Set(recent ?? []);
    const pick = (category: string) => {
      const options = available.filter((i) => i.category === category);
      return options.find((o) => !avoid.has(o.id)) ?? options[0];
    };
    const top = pick("Tops");
    const bottom = pick("Bottoms");
    const shoe = pick("Shoes");
    if (!top || !bottom || !shoe) return null;
    return { itemIds: [top.id, bottom.id, shoe.id], score: 1 };
  };

  test("passes the previous day's pieces when choosing from what is packed", () => {
    const seen: (string[] | undefined)[] = [];
    const spy: OutfitBuilder = (d, a, recent) => {
      seen.push(recent);
      return simple(d, a);
    };
    solveCapsule({ closet, days: days(3), level: 3, floor: 0.5, build: spy });
    // The first call has no history; a later one does.
    expect(seen[0]).toBeUndefined();
    expect(seen.some((r) => r && r.length > 0)).toBe(true);
  });

  /**
   * ⚠️ **The guarantee that matters.** A builder that actively avoids repeats
   * must not enlarge the capsule — because the solve only offers it the choice
   * among pieces it has already committed to.
   */
  test("varying days never adds a piece", () => {
    const plain = solveCapsule({ closet, days: days(4), level: 3, floor: 0.5, build: simple });
    const varied = solveCapsule({ closet, days: days(4), level: 3, floor: 0.5, build: varying });
    expect(varied.itemIds.length).toBeLessThanOrEqual(plain.itemIds.length);
    expect(varied.uncovered).toHaveLength(0);
  });

  /**
   * ⚠️ **The regression this whole section nearly shipped.**
   *
   * A builder that returns a score NEAR THE FLOOR, and lowers it when pieces
   * repeat, must still cover the day from what is packed. Return a penalised
   * score to the solve and a repeated outfit sinks under `floor`, the free
   * branch fails, and the solve buys a piece to escape its own variety nudge —
   * it took the real closet from six pieces to seven while the days STILL
   * repeated. The earlier tests missed it because their builders returned a
   * flat score of 1 and never touched the floor.
   */
  test("a near-floor score is not dragged under it by repeating", () => {
    const FLOOR = 0.7;

    /** Counts how often the solve had to fall back to the whole closet. */
    function costedFallbacks(build: OutfitBuilder) {
      let costed = 0;
      const spy: OutfitBuilder = (day, available, recent) => {
        if (available.length === closet.length) costed += 1;
        return build(day, available, recent);
      };
      solveCapsule({ closet, days: days(5), level: 3, floor: FLOOR, build: spy });
      return costed;
    }

    // Honest: reports the outfit's own quality, just above the floor.
    const honest: OutfitBuilder = (day, available) => {
      const built = simple(day, available);
      return built ? { ...built, score: 0.75 } : null;
    };

    // Buggy: subtracts its variety preference from the score it REPORTS, so a
    // fully-repeated outfit lands under the floor and the free branch fails.
    const leaky: OutfitBuilder = (day, available, recent) => {
      const built = simple(day, available);
      if (!built) return null;
      const repeated = built.itemIds.filter((id) => (recent ?? []).includes(id)).length;
      return { ...built, score: 0.75 - 0.25 * (repeated / built.itemIds.length) };
    };

    // ⚠️ Every extra fallback is a chance to buy a piece. On the real closet
    // this cost a seventh item while the days still repeated. `realBuilder`
    // re-scores its winner WITHOUT the penalty precisely to prevent it.
    expect(costedFallbacks(leaky)).toBeGreaterThan(costedFallbacks(honest));
  });

  // The costed branch must NOT receive history: a day may never add a piece
  // merely to avoid looking like yesterday.
  test("withholds history when it would cost a new piece", () => {
    const costedCalls: (string[] | undefined)[] = [];
    const spy: OutfitBuilder = (d, a, recent) => {
      // The costed branch is the one offered the whole closet.
      if (a.length === closet.length) costedCalls.push(recent);
      return simple(d, a);
    };
    solveCapsule({ closet, days: days(3), level: 3, floor: 0.5, build: spy });
    expect(costedCalls.length).toBeGreaterThan(0);
    expect(costedCalls.every((r) => r === undefined)).toBe(true);
  });
});
