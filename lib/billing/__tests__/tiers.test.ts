import { entitlementsFor, checkGeneration, checkCloset, FREE, PRO } from "../tiers";

describe("entitlementsFor", () => {
  test("free rerolls three times a day; pro is unlimited", () => {
    expect(entitlementsFor("free").regeneratesPerDay).toBe(3);
    expect(entitlementsFor("pro").regeneratesPerDay).toBeNull(); // null = unlimited
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

describe("checkCloset", () => {
  test("a free closet holds fifty pieces; pro is unlimited", () => {
    expect(entitlementsFor("free").closetItems).toBe(50);
    expect(entitlementsFor("pro").closetItems).toBeNull();
  });

  test("the allowance counts down and then blocks", () => {
    expect(checkCloset(FREE, 0)).toMatchObject({ allowed: true, remaining: 50 });
    expect(checkCloset(FREE, 49)).toMatchObject({ allowed: true, remaining: 1 });
    expect(checkCloset(FREE, 50)).toMatchObject({ allowed: false, remaining: 0 });
  });

  test("being over never reports a negative remaining", () => {
    expect(checkCloset(FREE, 999).remaining).toBe(0);
  });

  test("pro is never blocked", () => {
    expect(checkCloset(PRO, 5000)).toMatchObject({ allowed: true, remaining: null });
  });

  // Nothing in the product deletes an item, so a user at the cap needs to be
  // told the way back under it — otherwise the wall is final.
  test("a full closet names archiving as the way to make room", () => {
    const r = checkCloset(FREE, 50);
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/archive/i);
    expect(r.reason).toMatch(/pro/i);
  });

  // 50 is chosen to sit clear of the range where combo coverage thins (PR #15
  // measured 21 items at 21 combos in winter). A cap that starves the generator
  // sells a worse stylist rather than fewer features.
  test("the free cap is well above where the generator degrades", () => {
    expect(FREE.closetItems).toBeGreaterThan(30);
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

describe("checkGeneration — rerolls", () => {
  // One pool for the whole day, not one per occasion. Most people care about a
  // single occasion on a given day, so a per-occasion allowance rationed
  // hardest exactly where attention goes and was generous where nobody looked.
  test("free gets three rerolls a day, then is limited", () => {
    expect(checkGeneration(FREE, { kind: "regenerate", regeneratesUsed: 0 })).toMatchObject({
      allowed: true,
      remaining: 3,
    });
    expect(checkGeneration(FREE, { kind: "regenerate", regeneratesUsed: 2 })).toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(checkGeneration(FREE, { kind: "regenerate", regeneratesUsed: 3 })).toMatchObject({
      allowed: false,
      remaining: 0,
    });
  });

  // All three may be spent on one occasion — that is the point of pooling them.
  test("the pool does not care which occasion spent it", () => {
    expect(checkGeneration(FREE, { kind: "regenerate", regeneratesUsed: 2 }).allowed).toBe(true);
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

  test("a blocked reroll carries a reason a screen can show the user", () => {
    const r = checkGeneration(FREE, { kind: "regenerate", regeneratesUsed: 3 });
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
