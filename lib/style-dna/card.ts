import { STORY_SAFE, wrapLines, type FontSpec, type Measure } from "@/lib/share/card-layout";

/** Aggregates only: no photo, piece name, user name or handle may ever be added here (spec D6). */
export type DnaCardInput = {
  kicker: string;
  label: string;
  archetype: string;
  blurb: string;
  swatches: { hex: string; label: string }[];
  stats: { value: string; label: string }[];
  footer: string;
};

export const DNA_CARD = { w: 1080, h: 1920 } as const;
const M = 96;
const WIDTH = DNA_CARD.w - 2 * M;
const serif = (size: number, italic = false): FontSpec => ({ family: "serif", size, italic });
const sans = (size: number, weight = 400, caps = false): FontSpec => ({ family: "sans", size, weight, caps });

type Text = { lines: string[]; x: number; y: number; lineHeight: number; font: FontSpec };
export type DnaLayout = {
  frame: { x: number; y: number; w: number; h: number };
  mark: { x: number; y: number; size: number };
  wordmark: { x: number; y: number; font: FontSpec };
  kicker: { text: string; x: number; y: number; font: FontSpec };
  label: { text: string; x: number; y: number; font: FontSpec };
  title: Text;
  blurb: Text;
  swatches: { x: number; y: number; w: number; h: number; hex: string; label: string; labelY: number }[];
  swatchFont: FontSpec;
  stats: { value: string; label: string; x: number; y: number; labelY: number }[];
  statValueFont: FontSpec;
  statLabelFont: FontSpec;
  divider: number;
  footer: { text: string; x: number; y: number; font: FontSpec };
};

function fitText(text: string, sizes: number[], make: (s: number) => FontSpec, measure: Measure, maxLines: number) {
  for (const size of sizes) {
    const font = make(size);
    const r = wrapLines(text, WIDTH, font, measure, maxLines);
    // wrapLines keeps a single over-long word on its own line; that is overflow too.
    if (!r.overflow && r.lines.every((line) => measure(line, font) <= WIDTH)) return { font, lines: r.lines };
  }
  const font = make(sizes[sizes.length - 1]);
  return { font, lines: wrapLines(text, WIDTH, font, measure, maxLines).lines };
}

/** The mockup card (dna-back.png) on a 1080×1920 Story, centred in the platforms' safe area. */
export function layoutDnaCard(input: DnaCardInput, measure: Measure): DnaLayout {
  const natural = build(input, measure, 0);
  const spare = STORY_SAFE.bottom - STORY_SAFE.top - natural.frame.h;
  return spare > 0 ? build(input, measure, Math.floor(spare / 2)) : natural;
}

function build(input: DnaCardInput, measure: Measure, shift: number): DnaLayout {
  let y = STORY_SAFE.top + 80 + shift;
  const mark = { x: M, y, size: 56 };
  const wordmark = { x: M + 76, y: y + 42, font: serif(40) };
  const kicker = { text: input.kicker, x: DNA_CARD.w - M, y: y + 38, font: sans(20, 500, true) };
  y += 200;
  const label = { text: input.label, x: M, y, font: sans(22, 500, true) };
  y += 30;
  const t = fitText(input.archetype, [132, 112, 96, 84], (s) => serif(s), measure, 2);
  const title: Text = { ...t, x: M, y, lineHeight: Math.round(t.font.size * 1.04) };
  y += title.lineHeight * title.lines.length + 40;
  // Up to four lines at 30px: reviewed copy in the longer languages (es, de, pt, uk) needs it to avoid an ellipsis.
  const b = fitText(input.blurb, [42, 38, 34, 30], (s) => serif(s, true), measure, 4);
  const blurb: Text = { ...b, x: M, y, lineHeight: Math.round(b.font.size * 1.4) };
  y += blurb.lineHeight * blurb.lines.length + 60;
  const n = Math.max(1, input.swatches.length);
  const gap = 20;
  const w = Math.min(160, (WIDTH - gap * (n - 1)) / n);
  const swatches = input.swatches.map((s, i) => ({ x: M + i * (w + gap), y, w, h: 100, hex: s.hex, label: s.label, labelY: y + 140 }));
  y += 140 + 110;
  const col = WIDTH / 3;
  const stats = input.stats.slice(0, 3).map((s, i) => ({ value: s.value, label: s.label, x: M + i * col, y, labelY: y + 50 }));
  const divider = y + 110;
  const footer = { text: input.footer, x: M, y: divider + 60, font: sans(20, 500, true) };
  return {
    frame: { x: 48, y: STORY_SAFE.top + shift, w: DNA_CARD.w - 96, h: footer.y + 60 - (STORY_SAFE.top + shift) },
    mark, wordmark, kicker, label, title, blurb, swatches, swatchFont: sans(16, 500, true),
    stats, statValueFont: serif(84), statLabelFont: sans(20, 500, true), divider, footer,
  };
}
