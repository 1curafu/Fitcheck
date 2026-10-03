import type { CandidateItem } from "@/lib/generator/candidates";
import { blurbKeys, fabric, quizVsCloset, readCloset, styleMix, stylesOf, swatches, tendencies, type Tendencies } from "../closet";

let n = 0;
const piece = (category: string, extra: Partial<CandidateItem> = {}): CandidateItem => ({
  id: `p${n++}`, category, colors: ["navy"], formality: 3, seasons: [], material: "Cotton", texture: "Flat", pattern: "solid", ...extra,
});
const plain = (count: number) => Array.from({ length: count }, (_, i) => piece(["Tops", "Bottoms", "Shoes"][i % 3]));

describe("styleMix and readCloset", () => {
  test("a piece carries every style whose signature mark fires", () => {
    expect(stylesOf(piece("Shoes", { subcategory: "Loafers" }))).toEqual(["Old Money", "Preppy"]);
    expect(stylesOf(piece("Tops", { subcategory: "Hoodie" }))).toEqual(["Streetwear"]);
    expect(stylesOf(piece("Tops", { subcategory: "Knit" }))).toEqual([]);
  });

  test("too few pieces falls back to the quiz answer", () => {
    const closet = [...Array.from({ length: 6 }, () => piece("Tops", { subcategory: "Hoodie" }))];
    expect(readCloset(styleMix(closet), "Old Money")).toEqual({ source: "quiz", archetype: "Old Money" });
  });

  test("too few marked pieces falls back to the quiz answer, even in a big closet", () => {
    const closet = [...plain(20), ...Array.from({ length: 4 }, () => piece("Tops", { subcategory: "Hoodie" }))];
    expect(readCloset(styleMix(closet), null)).toEqual({ source: "quiz", archetype: null });
  });

  test("a clear leader is what the closet says", () => {
    const closet = [...plain(4), ...Array.from({ length: 6 }, () => piece("Tops", { subcategory: "Hoodie" })), piece("Bottoms", { subcategory: "Chinos" })];
    const mix = styleMix(closet);
    expect(mix).toMatchObject({ garments: 11, marked: 7 });
    expect(mix.shares.Streetwear).toBeCloseTo(6 / 7);
    expect(readCloset(mix, "Old Money")).toEqual({ source: "closet", archetype: "Streetwear" });
  });

  test("no clear leader (here a 50/50 tie) reads as Smart Casual", () => {
    const closet = [...plain(4),
      ...Array.from({ length: 3 }, () => piece("Tops", { subcategory: "Hoodie" })),
      ...Array.from({ length: 3 }, () => piece("Bottoms", { subcategory: "Chinos" }))];
    expect(readCloset(styleMix(closet), "Preppy")).toEqual({ source: "closet", archetype: "Smart Casual" });
  });

  test("a leader carried by under 30% of the garments is not a clear signal", () => {
    const closet = [...plain(20), ...Array.from({ length: 5 }, () => piece("Tops", { subcategory: "Hoodie" }))];
    expect(readCloset(styleMix(closet), null)).toEqual({ source: "closet", archetype: "Smart Casual" });
  });

  test("an empty closet has no mix and no NaN", () => {
    const mix = styleMix([]);
    expect(mix).toEqual({ garments: 0, marked: 0, shares: { "Old Money": 0, Preppy: 0, Streetwear: 0 } });
  });

  test("bags and accessories are not garments", () => {
    expect(styleMix([piece("Bags", { branding: "Large" }), piece("Accessories")]).garments).toBe(0);
  });
});

test("swatches are the closet's most frequent main colours, at most five, ties by name", () => {
  const closet = ["navy", "navy", "grey", "white", "black", "camel", "red", "grey"].map((c) => piece("Tops", { colors: [c] }));
  expect(swatches(closet).map((s) => s.color)).toEqual(["grey", "navy", "black", "camel", "red"]);
  expect(swatches(closet)[0].hex).toMatch(/^#[0-9a-f]{6}$/i);
  expect(swatches([])).toEqual([]);
});

describe("tendencies", () => {
  test("cut needs three non-Regular tagged garments", () => {
    expect(tendencies([piece("Tops", { fit: "Tailored" }), piece("Bottoms", { fit: "Relaxed" })]).cut).toBeNull();
    expect(tendencies([piece("Tops", { fit: "Tailored" }), piece("Bottoms", { fit: "Fitted" }), piece("Tops", { fit: "Relaxed" })]).cut)
      .toEqual({ value: 2 / 3, level: "tailored" });
    expect(tendencies([piece("Tops", { fit: "Oversized" }), piece("Bottoms", { fit: "Relaxed" }), piece("Tops", { fit: "Tailored" })]).cut?.level).toBe("relaxed");
    expect(tendencies([piece("Tops", { fit: "Tailored" }), piece("Tops", { fit: "Relaxed" }), piece("Tops", { fit: "Regular" }),
      piece("Tops", { fit: "Fitted" }), piece("Tops", { fit: "Oversized" })]).cut?.level).toBe("balanced");
  });

  test("tonal, pattern and heritage are shares of the garments", () => {
    const t = tendencies([
      piece("Tops", { colors: ["black"], pattern: "striped", subcategory: "Polo" }), piece("Bottoms", { colors: ["grey"] }),
      piece("Shoes", { colors: ["white"], subcategory: "Loafers" }), piece("Tops", { colors: ["red"] }),
    ]);
    expect(t.tonal).toEqual({ value: 0.75, level: "moderate" });
    expect(t.pattern).toEqual({ value: 0.25, level: "some" });
    expect(t.heritage).toEqual({ value: 0.5, level: "high" });
  });

  test("an empty closet has no tendencies at all", () => {
    expect(tendencies([])).toEqual({ cut: null, tonal: null, pattern: null, heritage: null });
  });
});

describe("quizVsCloset", () => {
  const neutrals = Array.from({ length: 5 }, (_, i) => piece("Tops", { colors: [i < 4 ? "grey" : "red"], fit: i < 3 ? "Tailored" : "Relaxed" }));

  test("palette and fit agreement are shares of the judged pieces", () => {
    expect(quizVsCloset(neutrals, "Neutrals", "Tailored")).toEqual({ palette: { answer: "Neutrals", share: 0.8 }, fit: { answer: "Tailored", share: 0.6 } });
  });

  test("an unanswered or retired answer makes no claim", () => {
    expect(quizVsCloset(neutrals, null, null)).toEqual({ palette: null, fit: null });
    expect(quizVsCloset(neutrals, "Pastel", "Boxy")).toEqual({ palette: null, fit: null });
  });

  test("fewer than five judged pieces makes no claim", () => {
    expect(quizVsCloset(neutrals.slice(0, 4), "Neutrals", "Tailored")).toEqual({ palette: null, fit: null });
  });
});

describe("fabric", () => {
  test("top three materials and the natural share of known fibres", () => {
    const closet = ["Wool", "Wool", "Cotton", "Polyester", "Linen", "Viscose", "Other"].map((material) => piece("Tops", { material }));
    expect(fabric(closet)).toEqual({ top: ["Wool", "Cotton", "Linen"], natural: 0.8, level: "natural" });
  });

  test("fewer than three known fibres is no fingerprint", () => {
    expect(fabric([piece("Tops", { material: "Viscose" }), piece("Tops", { material: "Wool" })])).toBeNull();
  });

  test("mostly synthetic", () => {
    expect(fabric(["Polyester", "Nylon", "Acrylic", "Cotton"].map((material) => piece("Tops", { material })))?.level).toBe("synthetic");
  });
});

describe("blurbKeys", () => {
  const none: Tendencies = { cut: null, tonal: null, pattern: null, heritage: null };

  test("the opening follows the reading, then the quiz, then fresh", () => {
    expect(blurbKeys({ source: "closet", archetype: "Old Money" }, none).opening).toBe("oldMoney");
    expect(blurbKeys({ source: "closet", archetype: "Smart Casual" }, none).opening).toBe("smartCasual");
    expect(blurbKeys({ source: "quiz", archetype: "Streetwear" }, none).opening).toBe("streetwear");
    expect(blurbKeys({ source: "quiz", archetype: null }, none).opening).toBe("fresh");
  });

  test("the trait is tone × cut, with mixed and balanced when unknown", () => {
    expect(blurbKeys({ source: "quiz", archetype: null }, none).trait).toBe("mixedBalanced");
    expect(blurbKeys({ source: "quiz", archetype: null }, { ...none, tonal: { value: 0.9, level: "strong" }, cut: { value: 0.8, level: "tailored" } }).trait).toBe("tonalTailored");
    expect(blurbKeys({ source: "quiz", archetype: null }, { ...none, tonal: { value: 0.3, level: "colourful" }, cut: { value: 0.2, level: "relaxed" } }).trait).toBe("colourfulRelaxed");
  });
});
