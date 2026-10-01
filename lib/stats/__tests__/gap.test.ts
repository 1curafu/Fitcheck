import { SEPARATES_SHAPE, ONE_PIECE_SHAPE } from "@/lib/generator/candidates";
import { readFileSync } from "node:fs";
import { biggestGap, slotCounts, GAP_CANDIDATES, candidatesFor, denimSafeCount, hiddenByNogos, relevantOccasions, type GapCandidate } from "../gap";
import type { CandidateItem } from "@/lib/generator/candidates";

const base = { occasions: ["everyday", "work"] as const };

const piece = (id: string, category: string, extra: Partial<CandidateItem> = {}): CandidateItem => ({
  id,
  category,
  colors: ["cream"],
  formality: 3,
  seasons: [],
  material: "Cotton",
  pattern: "solid",
  texture: "Flat",
  ...extra,
});

test("a closet with no bottoms is told a bottom unlocks the most", () => {
  const closet = [piece("t1", "Tops"), piece("s1", "Shoes", { colors: ["brown"], material: "Leather" })];
  const gap = biggestGap(closet, [...base.occasions]);
  expect(gap?.candidate.category).toBe("Bottoms");
  expect(gap?.unlocks).toBeGreaterThan(0);
});

test("the count is real — it equals the increase in buildable combinations", () => {
  const closet = [piece("t1", "Tops"), piece("s1", "Shoes", { colors: ["brown"], material: "Leather" })];
  // One top × one hypothetical bottom × one shoe = 1 combo on the MILD pass.
  // The cold pass scores 0 because this closet owns no coat — see the
  // outerwear rule in `countCombos`.
  expect(biggestGap(closet, ["everyday"])?.unlocks).toBe(1);
});

// ⚠️ THE reason the screen shows `share` and not `unlocks`. The raw count scales
// with parameters we invented — four occasions rather than one, two simulated
// conditions rather than one. Adding the cold pass doubled it overnight for an
// unchanged wardrobe, and a number that moves when an internal constant changes
// cannot be defended to a customer. The share does not move.

test("the raw count scales with our parameters and the share does not", () => {
  // A coat, so the cold pass is non-zero and the slot structure is the same on
  // both passes; formality 3 throughout, so every occasion admits every piece.
  const closet = [
    ...Array.from({ length: 4 }, (_, i) => piece(`t${i}`, "Tops")),
    ...Array.from({ length: 3 }, (_, i) => piece(`b${i}`, "Bottoms")),
    ...Array.from({ length: 2 }, (_, i) => piece(`s${i}`, "Shoes")),
    piece("o1", "Outerwear"),
  ];
  const one = biggestGap(closet, ["everyday"])!;
  const four = biggestGap(closet, ["everyday", "work", "weekend", "evening"])!;
  expect(four.unlocks).toBe(one.unlocks * 4); // the COUNT scales exactly
  expect(four.share!).toBeCloseTo(one.share!, 10); // the SHARE is untouched
});

test("the share reflects the size of the slot, not the size of the closet", () => {
  // A wardrobe is a PRODUCT of its slots, so adding one piece to a slot of size
  // s multiplies that pass by (s+1)/s. The share therefore depends on the
  // BOTTLENECK's depth and not on how big the rest of the wardrobe is — which
  // is why it never becomes absurd, and why it shrinks only when that slot is
  // genuinely deep and the honest answer is "you don't need another one".
  const shallow = [
    ...Array.from({ length: 9 }, (_, i) => piece(`t${i}`, "Tops")),
    ...Array.from({ length: 6 }, (_, i) => piece(`b${i}`, "Bottoms")),
    ...Array.from({ length: 2 }, (_, i) => piece(`s${i}`, "Shoes")),
    piece("o1", "Outerwear"),
  ];
  const deep = [
    ...Array.from({ length: 9 }, (_, i) => piece(`t${i}`, "Tops")),
    ...Array.from({ length: 6 }, (_, i) => piece(`b${i}`, "Bottoms")),
    ...Array.from({ length: 8 }, (_, i) => piece(`s${i}`, "Shoes")),
    ...Array.from({ length: 8 }, (_, i) => piece(`o${i}`, "Outerwear")),
  ];
  expect(biggestGap(shallow, ["everyday"])!.share!).toBeGreaterThan(
    biggestGap(deep, ["everyday"])!.share!,
  );
});

test("outerwear can win — the design's own example must be reachable", () => {
  // ⚠️ It could not be, for weeks. A single mild simulated temperature meant
  // `needsOuterwear` was always false, so no combination ever contained a coat
  // and every outerwear candidate scored exactly 0. Measured on the real dev
  // closet: camel overcoat +0, white sneakers +258. The cold pass is what makes
  // "A camel overcoat unlocks 14 new outfits" — the design's headline — possible.
  //
  // Occasions matter here: the camel overcoat is formality 4, which the
  // *everyday* band [1.5, 3] excludes. It can only win where it is wearable.
  const noCoat = [
    ...Array.from({ length: 8 }, (_, i) => piece(`t${i}`, "Tops")),
    ...Array.from({ length: 8 }, (_, i) => piece(`b${i}`, "Bottoms")),
    ...Array.from({ length: 8 }, (_, i) => piece(`s${i}`, "Shoes")),
  ];
  const gap = biggestGap(noCoat, ["work"])!;
  expect(gap.candidate.category).toBe("Outerwear");
});

test("a coatless closet is told to buy a coat before anything else", () => {
  // The failure this rule exists to prevent: with a plain slot product, going
  // from 0 coats to 1 leaves the combination count unchanged, so the single
  // most valuable purchase a coatless person can make scored exactly zero.
  const noCoat = [
    ...Array.from({ length: 3 }, (_, i) => piece(`t${i}`, "Tops")),
    ...Array.from({ length: 3 }, (_, i) => piece(`b${i}`, "Bottoms")),
    ...Array.from({ length: 3 }, (_, i) => piece(`s${i}`, "Shoes")),
  ];
  expect(biggestGap(noCoat, ["work"])!.candidate.category).toBe("Outerwear");
});

test("slot counts are the user's own numbers, and INCLUDE outerwear", () => {
  // ⚠️ Outerwear is not in `REQUIRED_CATEGORIES`, and leaving it out of this
  // made the card contradict itself on the real dev closet: it recommended a
  // camel overcoat and then explained "you have 4 pairs of shoes against 10
  // tops" — a reason for a different purchase entirely.
  const closet = [
    ...Array.from({ length: 9 }, (_, i) => piece(`t${i}`, "Tops")),
    ...Array.from({ length: 6 }, (_, i) => piece(`b${i}`, "Bottoms")),
    ...Array.from({ length: 2 }, (_, i) => piece(`s${i}`, "Shoes")),
    piece("o1", "Outerwear"),
  ];
  const counts = slotCounts(closet, ["everyday"]);
  expect(counts).toEqual({ Tops: 9, Bottoms: 6, Shoes: 2, Outerwear: 1 });
});

test("a closet with no coat reports zero, not a missing key", () => {
  // The page phrases "You have 0 coats against 9 tops" off this, so the slot
  // has to be present and zero rather than absent.
  const counts = slotCounts([piece("t1", "Tops")], ["everyday"]);
  expect(counts.Outerwear).toBe(0);
});

// NOT `expect(gap === null || gap.unlocks > 0)` — `biggestGap` only ever sets
// `best` when `unlocks > 0`, so that assertion is a tautology that can never
// fail. Assert the actual contract instead: whatever comes back is a real,
// positive unlock count.
test("a gap is only ever reported with a real, positive unlock count", () => {
  const rich = GAP_CANDIDATES.map((c, n) => piece(`x${n}`, c.category, { colors: ["navy"] }));
  const gap = biggestGap([...rich, ...rich], ["everyday"]);
  if (gap) {
    expect(gap.unlocks).toBeGreaterThan(0);
    expect(GAP_CANDIDATES).toContain(gap.candidate);
  }
});

test("an empty closet is not offered a gap — it is offered onboarding", () => {
  expect(biggestGap([], ["everyday"])).toBeNull();
});

// --- Beyond the plan --------------------------------------------------------

test("the claim survives a closet past the candidate CAP", () => {
  // ⚠️ The reason this counts SLOT PRODUCTS rather than combos. `buildCandidates`
  // stops at CAP = 200, so a large closet returns 200 both before and after the
  // hypothetical piece, every `unlocks` is 0, and the gap card vanishes — for
  // exactly the users who would pay for this screen.
  const big = [
    ...Array.from({ length: 12 }, (_, i) => piece(`t${i}`, "Tops")),
    ...Array.from({ length: 12 }, (_, i) => piece(`b${i}`, "Bottoms")),
    ...Array.from({ length: 12 }, (_, i) => piece(`s${i}`, "Shoes")),
  ];
  const gap = biggestGap(big, ["everyday"]);
  expect(gap).not.toBeNull();
  expect(gap!.unlocks).toBeGreaterThan(0);
});

test("a closet already holding everything still names its weakest slot", () => {
  // Not "no gap" — adding another top always unlocks combinations. The screen's
  // job is to name the best next purchase, not to declare the wardrobe finished.
  const complete = [
    piece("t1", "Tops"),
    piece("b1", "Bottoms"),
    piece("s1", "Shoes"),
    piece("o1", "Outerwear"),
  ];
  expect(biggestGap(complete, ["everyday"])).not.toBeNull();
});

test("the candidates are all placeable by the generator", () => {
  // A recommendation the generator could never use would be a lie. Every
  // GAP_CANDIDATE must sit in a category the candidate builder actually slots,
  // and carry a colour the palette knows — otherwise `colorHarmonyScore` cannot
  // place it and the unlock count is measuring a piece we could not style.
  for (const c of GAP_CANDIDATES) {
    // ⚠️ Sourced from the builder rather than restated, so adding a category
    // there cannot silently leave this list behind.
    expect([...SEPARATES_SHAPE, ...ONE_PIECE_SHAPE, "Outerwear"]).toContain(c.category);
    expect(c.formality).toBeGreaterThanOrEqual(1);
    expect(c.formality).toBeLessThanOrEqual(5);
    expect(c.colors.length).toBeGreaterThan(0);
  }
});

// ── The wardrobe that can build nothing ─────────────────────────────────────
// Found by Task 4 Step 2 of the plan — strip every bottom from the real closet
// and check the card by hand. `share` is `unlocks / before`, and `before` is
// ZERO when a required slot is empty, so the most urgent recommendation the app
// can ever make was rendering as "Adds 1% more outfits". A user straight out of
// onboarding's "capture your first five" is exactly this shape.

test("a closet missing a whole slot reports no share, not a tiny one", () => {
  const noBottoms = [
    ...Array.from({ length: 10 }, (_, i) => piece(`t${i}`, "Tops")),
    ...Array.from({ length: 4 }, (_, i) => piece(`s${i}`, "Shoes")),
  ];
  const gap = biggestGap(noBottoms, ["everyday", "work", "weekend", "evening"])!;
  expect(gap.candidate.category).toBe("Bottoms");
  expect(gap.share).toBeNull(); // NOT 0 — a proportion of nothing is undefined
  expect(gap.unlocks).toBeGreaterThan(0); // but the piece genuinely unlocks a lot
});

test("a wardrobe that can already build something still reports a share", () => {
  const complete = [
    ...Array.from({ length: 4 }, (_, i) => piece(`t${i}`, "Tops")),
    ...Array.from({ length: 3 }, (_, i) => piece(`b${i}`, "Bottoms")),
    ...Array.from({ length: 2 }, (_, i) => piece(`s${i}`, "Shoes")),
    piece("o1", "Outerwear"),
  ];
  expect(biggestGap(complete, ["everyday"])!.share).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Advice that fits either wardrobe, inferred rather than asked.
// ---------------------------------------------------------------------------

test("a dress wardrobe is never told to buy a white oxford shirt", () => {
  // ⚠️ The list was menswear-only. This is the user-visible wrong answer.
  const dressCloset = [
    { id: "d", category: "One-piece", colors: ["navy"], formality: 4, seasons: [], material: null, texture: null, pattern: null },
    { id: "s", category: "Shoes", colors: ["black"], formality: 4, seasons: [], material: null, texture: null, pattern: null },
  ];
  const labels = candidatesFor(dressCloset as never).map((c) => c.label);
  expect(labels).not.toContain("whiteShirt");
  expect(labels).not.toContain("woolTrousers");
  expect(labels).toContain("blackShoes"); // shoes suit everyone
});

test("a separates wardrobe is never told to buy a dress", () => {
  const closet = [
    { id: "t", category: "Tops", colors: ["white"], formality: 3, seasons: [], material: null, texture: null, pattern: null },
    { id: "b", category: "Bottoms", colors: ["navy"], formality: 3, seasons: [], material: null, texture: null, pattern: null },
  ];
  const labels = candidatesFor(closet as never).map((c) => c.label);
  expect(labels).not.toContain("blackDress");
  expect(labels).toContain("whiteShirt");
});

test("a mixed wardrobe sees both", () => {
  const closet = [
    { id: "t", category: "Tops", colors: ["white"], formality: 3, seasons: [], material: null, texture: null, pattern: null },
    { id: "d", category: "One-piece", colors: ["navy"], formality: 4, seasons: [], material: null, texture: null, pattern: null },
  ];
  const labels = candidatesFor(closet as never).map((c) => c.label);
  expect(labels).toContain("blackDress");
  expect(labels).toContain("whiteShirt");
});

test("biggestGap only ever proposes a candidate the closet's shape allows", () => {
  // ⚠️ HONEST NOTE: `candidatesFor` is currently REDUNDANT and this test cannot
  // prove otherwise. Measured across four closet shapes, filtering changes the
  // answer in none of them — a dress never wins for a separates closet because
  // a top or bottom always unlocks at least as much, and tops and bottoms
  // unlock ZERO for a dress-only closet, so `unlocks > 0` already excludes
  // them. The filter is kept as a guard for when the candidate pool grows, not
  // because it changes behaviour today.
  //
  // What this pins is the invariant, which stays true either way.
  const item = (id: string, category: string) => ({
    id, category, colors: ["navy"], formality: 3,
    seasons: [], material: null, texture: null, pattern: null,
  });
  for (const closet of [
    [item("t", "Tops"), item("b", "Bottoms"), item("s", "Shoes")],
    [item("d", "One-piece"), item("s", "Shoes"), item("s2", "Shoes")],
    [item("t", "Tops"), item("d", "One-piece"), item("s", "Shoes")],
  ]) {
    const best = biggestGap(closet as never, ["everyday"]);
    if (!best) continue;
    expect(candidatesFor(closet as never).map((c) => c.label)).toContain(best.candidate.label);
  }
});

describe("quiz part 2: the advice honours the quiz", () => {
  test("pieces the user's no-gos hide are not counted as owned", () => {
    const closet = [piece("t1", "Tops"), piece("b1", "Bottoms", { subcategory: "Shorts" }), piece("s1", "Shoes", { colors: ["brown"], material: "Leather" })];
    expect(slotCounts(closet, ["everyday"]).Bottoms).toBe(1);
    expect(slotCounts(closet, ["everyday"], { nogos: ["shorts"] }).Bottoms).toBe(0);
  });

  test("a closet whose only bottoms are ruled out is told to get bottoms — from nothing, so no share", () => {
    const closet = [piece("t1", "Tops"), piece("b1", "Bottoms", { subcategory: "Shorts" }), piece("s1", "Shoes", { colors: ["brown"], material: "Leather" })];
    const gap = biggestGap(closet, ["everyday"], { nogos: ["shorts"] });
    expect(gap?.candidate.category).toBe("Bottoms");
    expect(gap?.share).toBeNull();
  });

  test("the user's dress codes narrow what counts: suit trousers are not 'owned' for a smart-casual-only wardrobe", () => {
    const closet = [piece("t1", "Tops"), piece("b1", "Bottoms", { formality: 5 }), piece("s1", "Shoes", { colors: ["brown"], material: "Leather" })];
    expect(slotCounts(closet, ["work"]).Bottoms).toBe(1);
    expect(slotCounts(closet, ["work"], { formality_min: 3, formality_max: 3 }).Bottoms).toBe(0);
  });

  test("a suggestion the user's no-gos rule out is never made", () => {
    const loud: GapCandidate = { label: "navyKnit", category: "Tops", colors: ["navy"], formality: 3, branding: "Large" };
    expect(candidatesFor([piece("t1", "Tops")], { nogos: ["logos"] }, [loud])).toEqual([]);
    expect(candidatesFor([piece("t1", "Tops")], {}, [loud])).toEqual([loud]);
  });

  test("dark denim is tagged denim, so the double-denim rule can see it", () => {
    expect(GAP_CANDIDATES.find((c) => c.label === "darkDenim")?.material).toBe("Denim");
  });

  test("double denim is counted exactly — equal to brute force on random closets", () => {
    const rnd = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const r = rnd(42);
    for (let run = 0; run < 200; run++) {
      const slots = [true, true, false, true].map((garment) => {
        const n = Math.floor(r() * 4);
        return { garment, n, d: garment ? Math.floor(r() * (n + 1)) : 0 };
      });
      // brute force: every combination, count those with at most one denim garment
      let brute = 0;
      const walk = (i: number, denim: number) => {
        if (i === slots.length) { if (denim <= 1) brute++; return; }
        for (let k = 0; k < slots[i].n; k++) walk(i + 1, denim + (k < slots[i].d ? 1 : 0));
      };
      walk(0, 0);
      expect(denimSafeCount(slots), JSON.stringify(slots)).toBe(brute);
    }
  });

  test("with double denim ruled out, a denim-heavy closet counts fewer buildable outfits", () => {
    const closet = [
      piece("t1", "Tops", { material: "Denim" }), piece("t2", "Tops"),
      piece("b1", "Bottoms", { material: "Denim" }), piece("b2", "Bottoms"),
      piece("s1", "Shoes", { colors: ["brown"], material: "Leather" }),
    ];
    const plain = biggestGap(closet, ["everyday"]);
    const ruled = biggestGap(closet, ["everyday"], { nogos: ["double_denim"] });
    expect(plain && ruled).toBeTruthy();
    expect(ruled!.unlocks / (ruled!.share ?? 1)).toBeLessThan(plain!.unlocks / (plain!.share ?? 1)); // "before" shrank
  });

  test("without prefs the advice is exactly what it was", () => {
    const closet = [piece("t1", "Tops"), piece("s1", "Shoes", { colors: ["brown"], material: "Leather" })];
    expect(biggestGap(closet, ["everyday"], {})).toEqual(biggestGap(closet, ["everyday"]));
  });

  test("the stats page passes the user's prefs to both calls", () => {
    const page = readFileSync("app/[locale]/stats/page.tsx", "utf8");
    expect(page).toMatch(/biggestGap\(closet, ALL_OCCASIONS, gapPrefs\)/);
    expect(page).toMatch(/slotCounts\(closet, ALL_OCCASIONS, gapPrefs\)/);
  });
});

describe("an OLD-implementation oracle (captured from e4d02619:lib/stats/gap.ts before quiz part 2)", () => {
  // ⚠️ The earlier "without prefs" test compared the new code with itself. These expected values were produced by the
  // implementation that shipped in 0.6.0, on fixed closets, so a change to the no-prefs advice cannot slip through.
  const shoe = (id: string, f = 3) => piece(id, "Shoes", { colors: ["brown"], material: "Leather", formality: f });
  const closets: Record<string, CandidateItem[]> = {
    noBottoms: [piece("t1", "Tops"), shoe("s1")],
    starter: [piece("t1", "Tops"), piece("t2", "Tops"), piece("b1", "Bottoms"), shoe("s1")],
    withCoat: [piece("t1", "Tops"), piece("b1", "Bottoms"), shoe("s1"), piece("o1", "Outerwear", { material: "Wool" })],
    denimMix: [piece("t1", "Tops", { material: "Denim" }), piece("t2", "Tops"), piece("b1", "Bottoms", { material: "Denim" }), piece("b2", "Bottoms"), shoe("s1"), shoe("s2", 4)],
    dressesOnly: [piece("d1", "One-piece"), piece("d2", "One-piece"), shoe("s1")],
    formalOnly: [piece("t1", "Tops", { formality: 5 }), piece("b1", "Bottoms", { formality: 5 }), shoe("s1", 5)],
  };
  const expected: Record<string, unknown> = {"noBottoms": {"gap": {"label": "darkDenim", "unlocks": 2, "share": null}, "slots": {"Tops": 1, "Bottoms": 0, "Shoes": 1, "Outerwear": 0}}, "starter": {"gap": {"label": "darkDenim", "unlocks": 4, "share": 1}, "slots": {"Tops": 2, "Bottoms": 1, "Shoes": 1, "Outerwear": 0}}, "withCoat": {"gap": {"label": "navyKnit", "unlocks": 4, "share": 1}, "slots": {"Tops": 1, "Bottoms": 1, "Shoes": 1, "Outerwear": 1}}, "denimMix": {"gap": {"label": "camelCoat", "unlocks": 8, "share": 0.6666666666666666}, "slots": {"Tops": 2, "Bottoms": 2, "Shoes": 1, "Outerwear": 0}}, "dressesOnly": {"gap": null, "slots": {"Tops": 0, "Bottoms": 0, "Shoes": 1, "Outerwear": 0}}, "formalOnly": {"gap": {"label": "navyKnit", "unlocks": 1, "share": 1}, "slots": {"Tops": 0, "Bottoms": 0, "Shoes": 0, "Outerwear": 0}}};

  test.each(Object.keys(closets))("%s: advice and slot counts equal the shipped implementation's", (name) => {
    const g = biggestGap(closets[name], ["everyday", "work"]);
    expect({ gap: g ? { label: g.candidate.label, unlocks: g.unlocks, share: g.share } : null, slots: slotCounts(closets[name], ["everyday", "work"]) })
      .toEqual(expected[name]);
  });
});

describe("quiz part 2 review follow-ups", () => {
  test("denim SHOES never make double denim: a denim-shoe closet counts the same with the no-go as without", () => {
    const closet = [piece("t1", "Tops"), piece("b1", "Bottoms", { material: "Denim" }), piece("s1", "Shoes", { colors: ["blue"], material: "Denim" })];
    const plain = biggestGap(closet, ["everyday"]);
    const ruled = biggestGap(closet, ["everyday"], { nogos: ["double_denim"] });
    expect(ruled?.unlocks).toBe(plain?.unlocks);
    expect(denimSafeCount([{ garment: true, n: 1, d: 1 }, { garment: false, n: 1, d: 1 }])).toBe(1);
  });

  test("hiddenByNogos reports how many owned pieces the no-gos hide, per slot", () => {
    const closet = [piece("t1", "Tops"), piece("b1", "Bottoms", { subcategory: "Shorts" }), piece("b2", "Bottoms", { subcategory: "Shorts" }), piece("s1", "Shoes", { colors: ["brown"], material: "Leather" })];
    expect(hiddenByNogos(closet, ["everyday"], { nogos: ["shorts"] })).toMatchObject({ Bottoms: 2, Tops: 0, Shoes: 0 });
    expect(hiddenByNogos(closet, ["everyday"], {})).toMatchObject({ Bottoms: 0 });
  });

  test("occasions whose band the user's dress codes cannot reach are skipped, so the advice stays inside their codes", () => {
    // Business-only (4–4) widens to 3.5–4.5: Everyday [1.5, 3] cannot reach it; Weekend [1, 3.5] only touches it (kept).
    expect(relevantOccasions(["everyday", "weekend", "work", "evening"], { formality_min: 4, formality_max: 4 })).toEqual(["weekend", "work", "evening"]);
    // No prefs: every occasion. Nothing reachable at all: keep every occasion rather than empty the advice.
    expect(relevantOccasions(["everyday", "weekend"], {})).toEqual(["everyday", "weekend"]);
    expect(relevantOccasions(["everyday"], { formality_min: 5, formality_max: 5 })).toEqual(["everyday"]);
  });

  test("the advice for a Business-only wardrobe ignores occasions its dress codes cannot reach (behaviour, not just the helper)", () => {
    const biz = { formality_min: 4, formality_max: 4 };
    // formality 3 pieces: eligible for Everyday only through personalBand's FALLBACK to the full band — exactly what the skip removes.
    const closet = [piece("t1", "Tops"), piece("b1", "Bottoms"), piece("s1", "Shoes", { colors: ["brown"], material: "Leather" })];
    const both = biggestGap(closet, ["everyday", "work"], biz);
    const workOnly = biggestGap(closet, ["work"], biz);
    expect(both?.unlocks).toBe(workOnly?.unlocks);
    expect(biggestGap(closet, ["everyday", "work"])?.unlocks).not.toBe(workOnly?.unlocks); // without prefs Everyday counts
  });

  test("the stats page explains a no-go emptied slot with its own sentence", () => {
    const page = readFileSync("app/[locale]/stats/page.tsx", "utf8");
    expect(page).toMatch(/hiddenByNogos\(closet, ALL_OCCASIONS, gapPrefs\)/);
    expect(page).toContain('t("reasonNogos"');
  });
});
