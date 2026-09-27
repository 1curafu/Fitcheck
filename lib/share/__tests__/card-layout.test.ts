import { describe, expect, it } from "vitest";
import { CARD_SIZES, STORY_SAFE, containRect, layoutCard, wrapLines, type CardInput, type Measure } from "../card-layout";

const measure: Measure = (text, font) => text.length * font.size * 0.5; // every glyph 0.5em
const rail = (x: number, y: number) => ({ xPct: x, yPct: y, wPct: 18, hPct: 30, rotationDeg: 4, z: 1 });
const pieces = (n: number) => Array.from({ length: n }, (_, i) => ({
  n: i + 1, label: `Piece number ${i + 1} — Brand`,
  // Garments centre, accessories on the right/left rails — the real layout's extremes (lib/generator/layout.ts RAILS).
  slot: i % 2 ? rail(81, 24 + (i % 3) * 18) : rail(1, 60),
}));
const input = (over: Partial<CardInput> = {}): CardInput => ({
  title: "Quiet Camel", why: "The camel coat warms the charcoal, and the cream knit lets both breathe.",
  kicker: "Everyday · 26 Sep", pieces: pieces(4), ...over,
});
const worst = input({ pieces: pieces(8), title: "A Very Long Look Name For Testing Wraps", why: "word ".repeat(80) });
const shortTitle = input({ pieces: pieces(8), title: "Camel", why: null });

describe("wrapLines", () => {
  it("wraps greedily and ellipsizes past the line limit", () => {
    const r = wrapLines("one two three four five six", 40, { family: "serif", size: 10 }, measure, 2);
    expect(r.lines).toHaveLength(2);
    expect(r.overflow).toBe(true);
    expect(r.lines[1].endsWith("…")).toBe(true);
  });
});

describe("containRect", () => {
  it("fits an aspect inside a box, centred", () => {
    expect(containRect({ x: 0, y: 0, w: 200, h: 200 }, 2)).toEqual({ x: 0, y: 50, w: 200, h: 100 });
  });
});

describe("story safe areas (spec §3.2, Review Focus 5)", () => {
  const inRailBand = (y0: number, y1: number) => y1 >= STORY_SAFE.rightRail.y0 && y0 <= STORY_SAFE.rightRail.y1;
  for (const [name, inp] of [["worst case", worst], ["short title, no why", shortTitle]] as const) {
    it(`keeps text and pieces out of the covered zones — ${name}`, () => {
      const l = layoutCard("story", inp, measure);
      expect([l.width, l.height]).toEqual([1080, 1920]);
      expect(l.mark.y).toBeGreaterThanOrEqual(STORY_SAFE.top);
      expect(l.title.y).toBeGreaterThanOrEqual(STORY_SAFE.top);
      expect(l.title.lines.length).toBeLessThanOrEqual(2);
      const blocks = [l.title, ...(l.why ? [l.why] : [])];
      for (const b of blocks) b.lines.forEach((line, i) => {
        const base = b.y + b.lineHeight * (i + 1);
        const right = b.x + (i === 0 ? b.firstLineIndent : 0) + measure(line, b.font);
        if (inRailBand(base - b.font.size, base)) expect(right).toBeLessThanOrEqual(STORY_SAFE.rightRail.x);
      });
      for (const p of l.pieces) {
        if (inRailBand(p.rect.y, p.rect.y + p.rect.h)) expect(p.rect.x + p.rect.w).toBeLessThanOrEqual(STORY_SAFE.rightRail.x + 0.001);
      }
      for (const e of l.list!.entries) {
        expect(e.y).toBeLessThanOrEqual(STORY_SAFE.bottom);
        if (inRailBand(e.y - l.list!.font.size, e.y)) expect(e.labelX + measure(e.label, l.list!.font)).toBeLessThanOrEqual(STORY_SAFE.rightRail.x);
      }
      expect(l.stage.h).toBeGreaterThan(300);
    });
  }

  it("numbers every piece, lists 1–4 left and 5–8 right, number and label apart", () => {
    const l = layoutCard("story", input({ pieces: pieces(8) }), measure);
    expect(l.pieces.every((p) => p.numeral !== null)).toBe(true);
    expect(l.list!.entries.map((e) => e.num)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    const xs = l.list!.entries.map((e) => e.x);
    expect(new Set(xs.slice(0, 4)).size).toBe(1);
    expect(xs[4]).toBeGreaterThan(xs[0]);
    expect(l.list!.entries.every((e) => e.labelX > e.x && !e.label.startsWith(e.num))).toBe(true);
  });

  it("omits the why block when there is none, and the stage starts higher", () => {
    expect(layoutCard("story", input({ why: null }), measure).stage.y).toBeLessThan(layoutCard("story", input(), measure).stage.y);
  });

  it("maps slots into the stage without leaving it", () => {
    const l = layoutCard("story", input({ pieces: pieces(8) }), measure);
    for (const p of l.pieces) {
      expect(p.rect.x).toBeGreaterThanOrEqual(l.stage.x - 0.001);
      expect(p.rect.x + p.rect.w).toBeLessThanOrEqual(l.stage.x + l.stage.w + 0.001);
      expect(p.rect.y + p.rect.h).toBeLessThanOrEqual(l.stage.y + l.stage.h + 0.001);
    }
  });

  it("has no weather: the footer is the site only", () => {
    expect(layoutCard("story", input(), measure).footer).toEqual(expect.objectContaining({ text: "fitcheck.space" }));
  });
});

describe("post and preview", () => {
  it("post is 1080×1350 with a list above the footer", () => {
    const l = layoutCard("post", worst, measure);
    expect([l.width, l.height]).toEqual([CARD_SIZES.post.w, CARD_SIZES.post.h]);
    expect(l.list!.entries).toHaveLength(8);
    expect(l.list!.entries.at(-1)!.y).toBeLessThan(l.footer.y);
    expect(l.stage.h).toBeGreaterThan(300);
  });
  it("preview is 1200×630, grain-free, with no list and no numerals", () => {
    const l = layoutCard("preview", input({ pieces: pieces(8) }), measure);
    expect([l.width, l.height]).toEqual([1200, 630]);
    expect(l.grain).toBe(false);
    expect(l.list).toBeNull();
    expect(l.pieces.every((p) => p.numeral === null)).toBe(true);
  });
});
