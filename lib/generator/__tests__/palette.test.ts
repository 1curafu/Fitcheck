import { COLOR_NAMES } from "@/lib/ai/tagging-schema";
import { QUESTIONS } from "@/lib/onboarding/questions";
import { PALETTE_COLORS, inPalette, paletteScore } from "../palette";

const p = (category: string, color: string) => ({ category, colors: [color] });

test("the palettes are exactly the quiz's palette answers", () => {
  const quiz = QUESTIONS.find((q) => q.id === "palette")!.options.map((o) => o.value).sort();
  expect(Object.keys(PALETTE_COLORS).sort()).toEqual(quiz);
});

test("every palette colour is a colour the tagger can write", () => {
  for (const colours of Object.values(PALETTE_COLORS)) for (const c of colours) expect(COLOR_NAMES).toContain(c);
});

test.each([
  ["Neutrals", "stone", true], ["Neutrals", "red", false],
  ["Earth", "olive", true], ["Earth", "navy", false],
  ["Navy", "burgundy", true], ["Navy", "camel", false],
  ["Mono", "black", true], ["Mono", "beige", false],
])("%s contains %s: %s", (palette, colour, expected) => {
  expect(inPalette(colour, palette)).toBe(expected);
});

test("colour match ignores case and padding; an unknown palette contains nothing", () => {
  expect(inPalette(" Black ", "Mono")).toBe(true);
  expect(inPalette("black", "toString")).toBe(false);
});

describe("paletteScore", () => {
  test("no palette, an unknown palette, or nothing to judge: no opinion", () => {
    const look = [p("Tops", "black")];
    expect(paletteScore(look, null)).toBeNull();
    expect(paletteScore(look, "Pastel")).toBeNull();
    expect(paletteScore([p("Accessories", "red"), { category: "Tops", colors: [] }], "Mono")).toBeNull();
  });

  test("ONE statement piece is free — the owner's red sweater with black trousers scores full marks", () => {
    expect(paletteScore([p("Tops", "red"), p("Bottoms", "black"), p("Shoes", "white")], "Mono")).toBe(1);
  });

  test("a single piece, in or out of the palette, is never NaN — one statement piece is free even when it is all there is", () => {
    // ⚠️ Found by mutating `out <= 1` to `out < 1`: the share formula divides by (pieces - 1), which is 0 for one piece.
    expect(paletteScore([p("One-piece", "red")], "Mono")).toBe(1);
    expect(paletteScore([p("One-piece", "black")], "Mono")).toBe(1);
  });

  test("each further out-of-palette piece costs a share", () => {
    // 4 pieces, 2 out: 1 - (2-1)/(4-1)
    expect(paletteScore([p("Tops", "red"), p("Bottoms", "olive"), p("Shoes", "black"), p("Outerwear", "grey")], "Mono")).toBeCloseTo(2 / 3);
    // 3 pieces, all out: 1 - (3-1)/(3-1) = 0
    expect(paletteScore([p("Tops", "red"), p("Bottoms", "olive"), p("Shoes", "tan")], "Mono")).toBe(0);
  });

  test("only garments and shoes count; a piece's MAIN colour (the first) is what counts", () => {
    expect(paletteScore([p("Tops", "black"), p("Bags", "red"), p("Accessories", "gold"), p("Bottoms", "grey")], "Mono")).toBe(1);
    expect(paletteScore([{ category: "Tops", colors: ["black", "red"] }, p("Bottoms", "red"), p("Shoes", "orange")], "Mono")).toBe(0.5);
  });
});
