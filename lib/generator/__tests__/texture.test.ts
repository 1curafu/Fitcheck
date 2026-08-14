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

// --- The wearer's season tags outrank the photo -----------------------------
// User correction, 2026-08-13: "I have 2 pieces of wardrobe that are cable knit
// and they are good for summer in 18-27." He is right, and his closet already
// says so — two of his four cable-knit pieces carry a Summer tag. A cable is a
// STITCH PATTERN, not a weight: the same conflation `HOT_MATERIALS` made with
// "wool", one level down. `material`/`texture` are inferred from a photograph
// that cannot see yarn weight; `seasons` is the field the user confirms.

test("a cable knit is not warm by virtue of being cabled", () => {
  // The cotton cable polo that prompted this: it must not read like knitwear
  // built for February just because the stitch is decorative.
  expect(itemWarmth("Cotton", "Cable knit")).toBeLessThan(itemWarmth("Cotton", "Chunky knit"));
  expect(itemWarmth("Cotton", "Cable knit")).toBeLessThan(itemWarmth("Cotton", "Quilted"));
});

test("a Summer tag caps warmth — the wearer knows what they wear in the heat", () => {
  const cabled = itemWarmth("Cotton", "Cable knit");
  expect(itemWarmth("Cotton", "Cable knit", ["Spring", "Summer", "Autumn", "Winter"])).toBeLessThan(
    cabled,
  );
  // Even a genuinely warm construction is capped: the tag is the better evidence.
  expect(itemWarmth("Merino wool", "Chunky knit", ["Summer"])).toBeLessThan(0.6);
});

test("Winter without Summer floors warmth", () => {
  // The black cable crew neck, tagged Autumn/Winter, must read warmer than the
  // otherwise identical polo the wearer also wears in July.
  const winterOnly = itemWarmth("Cotton", "Cable knit", ["Autumn", "Winter"]);
  const yearRound = itemWarmth("Cotton", "Cable knit", ["Spring", "Summer", "Autumn", "Winter"]);
  expect(winterOnly).toBeGreaterThan(yearRound);
  expect(winterOnly).toBeGreaterThanOrEqual(0.65);
});

test("a year-round tag is capped, not floored — it claims no season for itself", () => {
  // Summer AND Winter both present is not a contradiction to resolve: the piece
  // is worn in heat, so the cap applies and the floor does not.
  const all = itemWarmth("Wool", "Ribbed", ["Spring", "Summer", "Autumn", "Winter"]);
  expect(all).toBeLessThanOrEqual(0.55);
});

test("insulation is exempt from the cap — physics outranks a mis-tag", () => {
  // A down gilet tagged Summer is a tagging error, not a summer garment.
  expect(itemWarmth("Down", "Quilted", ["Summer"])).toBeGreaterThan(0.7);
  expect(itemWarmth("Fleece", "Fleece-back", ["Spring", "Summer"])).toBeGreaterThan(0.7);
});

test("linen is exempt from the winter floor — the mirror of the insulation rule", () => {
  // A linen shirt tagged Winter is worn as an indoor layer; linen does not
  // insulate, and no tag makes it so. Without this the floor lifts it to 0.65
  // and it competes with knitwear in February.
  expect(itemWarmth("Linen", "Flat", ["Winter"])).toBeLessThan(0.4);
  expect(itemWarmth("Linen", "Flat", ["Winter"])).toBe(itemWarmth("Linen", "Flat"));
});

test("season tags are read case-insensitively, like everywhere else", () => {
  expect(itemWarmth("Cotton", "Cable knit", ["summer"])).toBe(
    itemWarmth("Cotton", "Cable knit", ["Summer"]),
  );
});

test("untagged seasons change nothing", () => {
  const bare = itemWarmth("Cotton", "Cable knit");
  expect(itemWarmth("Cotton", "Cable knit", [])).toBe(bare);
  expect(itemWarmth("Cotton", "Cable knit", null)).toBe(bare);
});

test("a summer-tagged knit beats a winter-only one on a warm day, and loses on a cold one", () => {
  // End to end through warmthFit — the behaviour the user actually sees.
  const summerPolo = [{ material: "Cotton", texture: "Cable knit", seasons: ["Summer", "Spring"] }];
  const winterCrew = [{ material: "Cotton", texture: "Cable knit", seasons: ["Autumn", "Winter"] }];
  expect(warmthFit(summerPolo, 24)).toBeGreaterThan(warmthFit(winterCrew, 24));
  expect(warmthFit(winterCrew, 2)).toBeGreaterThan(warmthFit(summerPolo, 2));
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
