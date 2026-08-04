import { entitlementsFor, checkGeneration, checkUploads, FREE, PRO } from "../tiers";

describe("entitlementsFor", () => {
  test("free regenerates once per occasion; pro is unlimited", () => {
    expect(entitlementsFor("free").regeneratesPerOccasion).toBe(1);
    expect(entitlementsFor("pro").regeneratesPerOccasion).toBeNull(); // null = unlimited
  });

  test("styled looks, analytics, gap analysis and packing are Pro only", () => {
    const free = entitlementsFor("free");
    expect(free.styledLooks).toBe(false);
    expect(free.analytics).toBe(false);
    expect(free.gapAnalysis).toBe(false);
    expect(free.packingMode).toBe(false);
    const pro = entitlementsFor("pro");
    expect(pro.styledLooks).toBe(true);
    expect(pro.analytics).toBe(true);
    expect(pro.gapAnalysis).toBe(true);
    expect(pro.packingMode).toBe(true);
  });

  test("an unknown or missing tier falls back to free — capabilities fail closed", () => {
    for (const bad of [null, undefined, "", "enterprise", 7, {}, "PRO"]) {
      expect(entitlementsFor(bad).tier).toBe("free");
      expect(entitlementsFor(bad).analytics).toBe(false);
      expect(entitlementsFor(bad).styledLooks).toBe(false);
    }
  });

  test("free saved-outfit cap is finite, pro's is not", () => {
    expect(FREE.savedOutfits).toBe(10);
    expect(PRO.savedOutfits).toBeNull();
  });
});

describe("checkUploads", () => {
  test("free adds ten pieces a day; pro is unlimited", () => {
    expect(entitlementsFor("free").uploadsPerDay).toBe(10);
    expect(entitlementsFor("pro").uploadsPerDay).toBeNull();
  });

  test("the allowance counts down and then blocks", () => {
    expect(checkUploads(FREE, 0)).toMatchObject({ allowed: true, remaining: 10 });
    expect(checkUploads(FREE, 9)).toMatchObject({ allowed: true, remaining: 1 });
    expect(checkUploads(FREE, 10)).toMatchObject({ allowed: false, remaining: 0 });
  });

  test("being over never reports a negative remaining", () => {
    expect(checkUploads(FREE, 99).remaining).toBe(0);
  });

  test("pro is never blocked", () => {
    expect(checkUploads(PRO, 5000)).toMatchObject({ allowed: true, remaining: null });
  });

  // The cap is PER DAY, not a total — the closet is the moat and the generator
  // measurably degrades on a small wardrobe, so nothing here may imply a ceiling
  // on closet size.
  test("a blocked upload says it is a daily limit, not a closet limit", () => {
    const r = checkUploads(FREE, 10);
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/today|day/i);
    expect(r.reason).not.toMatch(/closet is full|maximum items/i);
  });
});

describe("checkGeneration — drops", () => {
  // §1 of MONETISATION: the daily drop is the product and is never gated. An
  // occasion's first look of the day costs nothing on any tier.
  test("an occasion's first look of the day is free on every tier", () => {
    for (const e of [FREE, PRO]) {
      expect(checkGeneration(e, { kind: "drop", regeneratesUsed: 0 })).toMatchObject({
        allowed: true,
      });
    }
  });

  // Four occasions must all remain reachable — a user who has dropped three
  // occasions today is not "at a limit" for the fourth.
  test("a drop is allowed regardless of what other occasions have used", () => {
    expect(checkGeneration(FREE, { kind: "drop", regeneratesUsed: 99 }).allowed).toBe(true);
  });
});

describe("checkGeneration — regenerates", () => {
  test("free gets one regenerate for an occasion, then is limited", () => {
    expect(checkGeneration(FREE, { kind: "regenerate", regeneratesUsed: 0 })).toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(checkGeneration(FREE, { kind: "regenerate", regeneratesUsed: 1 })).toMatchObject({
      allowed: false,
      remaining: 0,
    });
  });

  // The allowance is PER OCCASION, so regenerating Work must not spend Evening's.
  // The caller supplies the count for the occasion being asked about; this asserts
  // the function never reaches for a global total.
  test("the allowance is counted per occasion, not globally", () => {
    expect(checkGeneration(FREE, { kind: "regenerate", regeneratesUsed: 0 }).allowed).toBe(true);
  });

  test("pro is never blocked and reports no finite remaining", () => {
    expect(checkGeneration(PRO, { kind: "regenerate", regeneratesUsed: 1000 })).toMatchObject({
      allowed: true,
      remaining: null,
    });
  });

  test("being over the allowance never reports a negative remaining", () => {
    expect(checkGeneration(FREE, { kind: "regenerate", regeneratesUsed: 99 }).remaining).toBe(0);
  });

  test("a blocked regenerate carries a reason a screen can show the user", () => {
    const r = checkGeneration(FREE, { kind: "regenerate", regeneratesUsed: 1 });
    expect(r.allowed).toBe(false);
    expect(typeof r.reason).toBe("string");
    expect(r.reason).toMatch(/pro/i);
  });
});

describe("checkGeneration — styled looks", () => {
  // Pro #2. Gated rather than given a free allowance: "first per item free" has
  // no ceiling, since it scales with closet size.
  test("free cannot build a look around a piece, and is told why", () => {
    const r = checkGeneration(FREE, { kind: "styled", regeneratesUsed: 0 });
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/pro/i);
  });

  test("pro can, without limit", () => {
    expect(checkGeneration(PRO, { kind: "styled", regeneratesUsed: 0 })).toMatchObject({
      allowed: true,
      remaining: null,
    });
  });

  // The gate must not depend on the regenerate counter — styling an item is a
  // different question from asking an occasion again.
  test("a styled look is not affected by regenerate usage", () => {
    expect(checkGeneration(PRO, { kind: "styled", regeneratesUsed: 99 }).allowed).toBe(true);
  });
});
