import { maxWears, REWEAR_LABELS, REWEAR_HINTS } from "../rewear";

describe("maxWears", () => {
  // Outerwear and shoes are worn the whole trip at any setting — nobody packs
  // one coat per day, and a solve that thinks they might will pad the capsule.
  /**
   * ⚠️ Level 1 INCLUDED. "Fresh every day" means fresh clothes — nobody means a
   * different pair of shoes each day. Excluding level 1 here once made a
   * five-day trip demand five pairs of shoes, so a four-pair closet reported
   * uncovered days for a reason no human would accept.
   */
  test("outerwear and shoes are re-worn the whole trip at every level", () => {
    for (const level of [1, 2, 3, 4, 5]) {
      expect(maxWears("Outerwear", level, 7)).toBe(7);
      expect(maxWears("Shoes", level, 7)).toBe(7);
      expect(maxWears("Accessories", level, 7)).toBe(7);
    }
  });

  test("tops are the tightest category, bottoms one step looser", () => {
    expect(maxWears("Tops", 3, 7)).toBe(3);
    expect(maxWears("Bottoms", 3, 7)).toBe(4);
  });

  // Level 1 is "fresh every day": nothing is ever re-worn, including a coat.
  test("level 1 means a fresh garment every day — but not fresh shoes", () => {
    expect(maxWears("Tops", 1, 7)).toBe(1);
    expect(maxWears("Bottoms", 1, 7)).toBe(1);
    // The whole point of the correction.
    expect(maxWears("Outerwear", 1, 7)).toBe(7);
    expect(maxWears("Shoes", 1, 7)).toBe(7);
  });

  /**
   * The regression, stated as the user hit it: five days, four pairs of shoes,
   * "fresh every day". Shoes must not be the reason a day cannot be dressed.
   */
  test("four pairs of shoes still cover a five-day trip at level 1", () => {
    expect(maxWears("Shoes", 1, 5)).toBeGreaterThanOrEqual(5);
  });

  test("a limit never exceeds the trip length", () => {
    expect(maxWears("Tops", 5, 2)).toBe(2);
    expect(maxWears("Bottoms", 5, 2)).toBe(2);
  });

  test("an unknown category is treated as a top — the tightest, so it never over-packs", () => {
    expect(maxWears("Fragrance", 3, 7)).toBe(3);
  });

  test("levels are ordered: looser settings never allow fewer wears", () => {
    for (const cat of ["Tops", "Bottoms"]) {
      for (const level of [1, 2, 3, 4]) {
        expect(maxWears(cat, level + 1, 7)).toBeGreaterThanOrEqual(maxWears(cat, level, 7));
      }
    }
  });

  // Out-of-range input clamps rather than throwing: the level arrives from a
  // meter position stored in the database, and a bad row must not break a trip.
  test("clamps a level outside 1–5", () => {
    expect(maxWears("Tops", 0, 7)).toBe(maxWears("Tops", 1, 7));
    expect(maxWears("Tops", 99, 7)).toBe(maxWears("Tops", 5, 7));
  });
});

test("there is one label and one hint per level", () => {
  expect(REWEAR_LABELS).toHaveLength(5);
  expect(REWEAR_HINTS).toHaveLength(5);
});
