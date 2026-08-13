import { MATERIALS, TEXTURES } from "@/lib/ai/tagging-schema";
import { MATERIAL_WARMTH, TEXTURE_WARMTH, itemWarmth, warmthFit } from "../texture";

test("chunky structures read warm, fine ones read light", () => {
  expect(itemWarmth("Cotton", "Chunky knit")).toBeGreaterThan(itemWarmth("Cotton", "Fine knit"));
  expect(itemWarmth("Cotton", "Fleece-back")).toBeGreaterThan(itemWarmth("Cotton", "Flat"));
});

test("the same fibre reads differently by construction — the merino case", () => {
  // The distinction the whole signal exists for: a chunky merino sweater and a
  // fine merino tee share a material and are a season apart.
  expect(itemWarmth("Merino wool", "Fine knit")).toBeLessThan(0.5);
  expect(itemWarmth("Merino wool", "Chunky knit")).toBeGreaterThan(0.7);
});

test("the same construction reads differently by fibre — the tweed case", () => {
  // Texture alone would miss this: tweed's warmth is in the cloth, and its
  // weave (Twill/Herringbone) is one a linen shirt also uses.
  expect(itemWarmth("Tweed", "Twill")).toBeGreaterThan(itemWarmth("Linen", "Twill"));
});

test("insulation reads warm whatever the weave", () => {
  for (const t of ["Flat", "Quilted", "Pile", null]) {
    expect(itemWarmth("Down", t)).toBeGreaterThan(0.7);
    expect(itemWarmth("Fleece", t)).toBeGreaterThan(0.7);
  }
});

test("an untagged item is neutral, never a penalty", () => {
  expect(itemWarmth(null, null)).toBe(0.5);
  expect(itemWarmth("", "")).toBe(0.5);
});

test("an unknown value is neutral rather than an error", () => {
  expect(itemWarmth("unobtanium", "sparkly")).toBe(0.5);
});

// A vocabulary value the warmth tables do not name falls through to 0.5 —
// silently, with no error anywhere. The signal simply stops working for that
// garment. This is the exact failure mode `HOT_MATERIALS` had when `material`
// became an enum and `shearling`/`puffer` quietly stopped matching, so it is
// pinned from the VOCABULARY side: add a material to the enum without scoring
// it and this test names it.

/** Neutral on purpose — hardware and a fabric the tagger could not identify. */
const INTENTIONALLY_NEUTRAL = ["Stainless steel", "Gold", "Silver", "Rubber", "Other"];

// Membership, not the number: `Denim`, `Canvas`, `Nylon` and `Polyester` are
// genuinely worth 0.5, so a missing entry cannot be detected by its value.

test("every material the tagger may emit is scored, or deliberately neutral", () => {
  const unscored = MATERIALS.filter(
    (m) => !(m in MATERIAL_WARMTH) && !INTENTIONALLY_NEUTRAL.includes(m),
  );
  expect(unscored).toEqual([]);
  for (const m of INTENTIONALLY_NEUTRAL) expect(itemWarmth(m, null)).toBe(0.5);
});

test("every texture the tagger may emit is scored, or deliberately neutral", () => {
  const unscored = TEXTURES.filter((t) => !(t in TEXTURE_WARMTH) && t !== "Other");
  expect(unscored).toEqual([]);
  expect(itemWarmth(null, "Other")).toBe(0.5);
});

test("suede reads warmer than smooth leather", () => {
  // Nap traps air, and it is a cold-season shoe. Both are shoes, so the
  // difference is small by design — but it is the right direction.
  expect(itemWarmth("Suede", "Flat")).toBeGreaterThan(itemWarmth("Leather", "Flat"));
});

test("warm pieces fit a cold day better than light ones", () => {
  const chunky = [{ material: "Cotton", texture: "Chunky knit" }];
  const fine = [{ material: "Cotton", texture: "Fine knit" }];
  expect(warmthFit(chunky, 2)).toBeGreaterThan(warmthFit(fine, 2));
});

test("and the reverse on a hot day", () => {
  const chunky = [{ material: "Cotton", texture: "Chunky knit" }];
  const fine = [{ material: "Cotton", texture: "Fine knit" }];
  expect(warmthFit(fine, 30)).toBeGreaterThan(warmthFit(chunky, 30));
});

test("a tropical wool trouser is not penalised in heat the way a fleece is", () => {
  // The user's correction, pinned: fibre alone never decides. This is the
  // scoring-side counterpart to the guard in lib/generator/__tests__/rules.test.ts.
  const wool = [{ material: "Wool", texture: "Flat" }];
  const fleece = [{ material: "Fleece", texture: "Fleece-back" }];
  expect(warmthFit(wool, 30)).toBeGreaterThan(warmthFit(fleece, 30));
});

// The gap between a chunky and a fine knit must SHRINK as the weather turns
// mild, not vanish. A bare `1 - |want - have|` does NOT deliver this: once
// `want` sits outside the two warmth values the gap between them is constant,
// so 18° and 0° discriminate identically. The confidence damping in the
// implementation is what makes this test pass, and this test is why it exists.
test("the warmth signal discriminates less in mild weather than in the cold", () => {
  const chunky = [{ material: "Cotton", texture: "Chunky knit" }];
  const fine = [{ material: "Cotton", texture: "Fine knit" }];
  const mild = Math.abs(warmthFit(chunky, 18) - warmthFit(fine, 18));
  const cold = Math.abs(warmthFit(chunky, 0) - warmthFit(fine, 0));
  expect(mild).toBeLessThan(cold);
});

test("around 12°C the term has no opinion at all", () => {
  // Neither a knit nor a shirt is wrong at 12°: the honest answer is silence,
  // so warmth stops voting and colour, formality and DNA decide.
  const chunky = [{ material: "Cotton", texture: "Chunky knit" }];
  const linen = [{ material: "Linen", texture: "Flat" }];
  expect(warmthFit(chunky, 12.5)).toBeCloseTo(0.5, 5);
  expect(warmthFit(linen, 12.5)).toBeCloseTo(0.5, 5);
});

test("warmthFit stays inside 0..1 at both extremes", () => {
  for (const t of [-10, 0, 18, 40]) {
    const v = warmthFit(
      [
        { material: "Cotton", texture: "Chunky knit" },
        { material: "Linen", texture: "Flat" },
      ],
      t,
    );
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  }
});

// --- What actually keeps you warm -------------------------------------------
// Averaging every piece equally lets a watch and a pair of shoes dilute the
// signal exactly when it should be loudest. The layers on your torso decide.

test("a watch does not dilute the warmth of a winter outfit", () => {
  const withWatch = [
    { category: "Tops", material: "Merino wool", texture: "Chunky knit" },
    { category: "Bottoms", material: "Wool", texture: "Flat" },
    { category: "Accessories", material: "Stainless steel", texture: null },
  ];
  const without = withWatch.slice(0, 2);
  expect(Math.abs(warmthFit(withWatch, 0) - warmthFit(without, 0))).toBeLessThan(0.05);
});

test("a coat moves the reading more than shoes do", () => {
  const base = [
    { category: "Tops", material: "Cotton", texture: "Flat" },
    { category: "Bottoms", material: "Cotton", texture: "Flat" },
  ];
  const withCoat = [...base, { category: "Outerwear", material: "Down", texture: "Quilted" }];
  const withBoots = [...base, { category: "Shoes", material: "Down", texture: "Quilted" }];
  expect(warmthFit(withCoat, 0)).toBeGreaterThan(warmthFit(withBoots, 0));
});

test("category weighting reads DB TitleCase and test-style lowercase alike", () => {
  const title = [{ category: "Shoes", material: "Down", texture: "Quilted" }];
  const lower = [{ category: "shoes", material: "Down", texture: "Quilted" }];
  expect(warmthFit(title, 0)).toBe(warmthFit(lower, 0));
});

test("an uncategorised item still counts", () => {
  // The score fixtures and any future caller may omit it; a missing category
  // must never silently zero a piece out of the average.
  expect(warmthFit([{ material: "Cotton", texture: "Chunky knit" }], 0)).toBeGreaterThan(0.5);
});
