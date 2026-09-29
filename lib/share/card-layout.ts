import type { Slot } from "@/lib/generator/types";

export type CardTarget = "story" | "post" | "preview";
export type Rect = { x: number; y: number; w: number; h: number };
export type FontSpec = { family: "serif" | "sans"; size: number; italic?: boolean; weight?: number; caps?: boolean };
export type Measure = (text: string, font: FontSpec) => number;
export type CardPiece = { n: number; label: string; slot: Slot };
export type CardInput = { title: string; why: string | null; kicker: string; footer?: string; pieces: CardPiece[] };
export type TextBlock = { x: number; y: number; font: FontSpec; lineHeight: number; lines: string[]; firstLineIndent: number };
export type PlacedPiece = { n: number; rect: Rect; rotationDeg: number; z: number; numeral: { x: number; y: number } | null };
export type ListEntry = { n: number; num: string; label: string; x: number; labelX: number; y: number };
export type CardLayout = {
  width: number; height: number; frame: Rect | null; grain: boolean;
  mark: { x: number; y: number; size: number };
  wordmark: { x: number; y: number; font: FontSpec };
  kicker: { x: number; y: number; font: FontSpec; text: string; align: "left" | "right" };
  title: TextBlock;
  why: (TextBlock & { glyph: { x: number; y: number; font: FontSpec } }) | null;
  stage: Rect;
  pieces: PlacedPiece[];
  list: { font: FontSpec; entries: ListEntry[] } | null;
  footer: { font: FontSpec; x: number; y: number; text: string; align: "left" | "right" };
};

export const CARD_SIZES: Record<CardTarget, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 }, post: { w: 1080, h: 1350 }, preview: { w: 1200, h: 630 },
};
/** The flat-lay slots were authored for the stylist's landscape stage (lib/generator/layout.ts, ~385×230). */
export const LAYOUT_ASPECT = 385 / 230;
/** What Instagram and TikTok cover on a 1080×1920 story (spec §3.2). */
export const STORY_SAFE = { top: 250, bottom: 1920 - 340, rightRail: { x: 1080 - 120, y0: 820, y1: 1480 } };

const ELLIPSIS = "…";
const serif = (size: number, italic = false): FontSpec => ({ family: "serif", size, italic });
const sans = (size: number, weight = 400, caps = false): FontSpec => ({ family: "sans", size, weight, caps });

export function wrapLines(text: string, maxWidth: number, font: FontSpec, measure: Measure, maxLines: number, firstLineIndent = 0):
  { lines: string[]; overflow: boolean } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  let i = 0;
  for (; i < words.length; i++) {
    const width = maxWidth - (lines.length === 0 ? firstLineIndent : 0);
    const next = current ? `${current} ${words[i]}` : words[i];
    if (measure(next, font) <= width || !current) { current = next; continue; }
    lines.push(current);
    current = words[i];
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && current) { lines.push(current); current = ""; i = words.length; }
  const overflow = i < words.length || Boolean(current);
  if (overflow) {
    const k = lines.length - 1;
    const width = maxWidth - (k === 0 ? firstLineIndent : 0);
    let last = lines[k];
    while (measure(`${last}${ELLIPSIS}`, font) > width && last.length > 1) {
      last = last.includes(" ") ? last.slice(0, last.lastIndexOf(" ")) : last.slice(0, -1);
    }
    lines[k] = `${last}${ELLIPSIS}`;
  }
  return { lines, overflow };
}

function fit(text: string, maxWidth: number, sizes: number[], make: (size: number) => FontSpec, measure: Measure,
  maxLines: number, indentFor: (f: FontSpec) => number) {
  for (const size of sizes) {
    const font = make(size);
    const r = wrapLines(text, maxWidth, font, measure, maxLines, indentFor(font));
    if (!r.overflow) return { font, lines: r.lines };
  }
  const font = make(sizes[sizes.length - 1]);
  return { font, lines: wrapLines(text, maxWidth, font, measure, maxLines, indentFor(font)).lines };
}

export function containRect(box: Rect, aspect: number): Rect {
  const w = Math.min(box.w, box.h * aspect);
  const h = w / aspect;
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

function placePieces(stage: Rect, pieces: CardPiece[], numerals: boolean): PlacedPiece[] {
  const c = containRect(stage, LAYOUT_ASPECT);
  return pieces.map((p) => {
    const rect = { x: c.x + (p.slot.xPct / 100) * c.w, y: c.y + (p.slot.yPct / 100) * c.h, w: (p.slot.wPct / 100) * c.w, h: (p.slot.hPct / 100) * c.h };
    return {
      n: p.n, rect, rotationDeg: p.slot.rotationDeg, z: p.slot.z,
      numeral: numerals ? { x: Math.max(stage.x + 4, rect.x - 16), y: Math.max(stage.y + 24, rect.y + 20) } : null,
    };
  });
}

type Frame = {
  w: number; h: number; margin: number; frameInset: number; top: number; markSize: number;
  titleSizes: number[]; whySizes: number[]; whyMaxLines: number; textWidth: number;
  stageRight: number; listFont: number; listRow: number; listBottom: number; listColumnWidth: number; footerY: number; footerFont: number;
};

// Story: text and stage end at x = 960 so nothing sits under TikTok's right rail (spec §3.2, Review Focus 5).
const STACKED: Record<"story" | "post", Frame> = {
  story: {
    w: 1080, h: 1920, margin: 88, frameInset: 37, top: STORY_SAFE.top + 12, markSize: 58,
    titleSizes: [140, 118, 100], whySizes: [40, 36, 32], whyMaxLines: 4, textWidth: 860,
    stageRight: STORY_SAFE.rightRail.x, listFont: 28, listRow: 38, listBottom: STORY_SAFE.bottom - 16,
    listColumnWidth: 380, footerY: 1920 - 88, footerFont: 24,
  },
  post: {
    w: 1080, h: 1350, margin: 76, frameInset: 30, top: 70, markSize: 52,
    titleSizes: [112, 96, 84], whySizes: [32, 29, 26], whyMaxLines: 3, textWidth: 920,
    stageRight: 1080 - 33, listFont: 25, listRow: 34, listBottom: 1350 - 120,
    listColumnWidth: 440, footerY: 1350 - 58, footerFont: 22,
  },
};

function whyBlock(text: string, x: number, y: number, width: number, sizes: number[], maxLines: number, measure: Measure) {
  const indentFor = (f: FontSpec) => measure("f ", { ...f, italic: true });
  const w = fit(text, width, sizes, (s) => serif(s, true), measure, maxLines, indentFor);
  const lineHeight = w.font.size * 1.42;
  return {
    block: { x, y, font: w.font, lineHeight, lines: w.lines, firstLineIndent: indentFor(w.font), glyph: { x, y, font: serif(Math.round(w.font.size * 1.2), true) } },
    bottom: y + lineHeight * w.lines.length,
  };
}

function stacked(target: "story" | "post", input: CardInput, measure: Measure): CardLayout {
  const f = STACKED[target];
  const m = f.margin;
  const titleTop = f.top + f.markSize + 60;
  const t = fit(input.title, f.textWidth, f.titleSizes, (s) => serif(s), measure, 2, () => 0);
  const titleLH = t.font.size * 0.95;
  const title: TextBlock = { x: m - 6, y: titleTop, font: t.font, lineHeight: titleLH, lines: t.lines, firstLineIndent: 0 };
  let cursor = titleTop + titleLH * t.lines.length;

  let why: CardLayout["why"] = null;
  if (input.why) {
    const w = whyBlock(input.why, m, cursor + 28, f.textWidth, f.whySizes, f.whyMaxLines, measure);
    why = w.block;
    cursor = w.bottom;
  }

  const rows = Math.ceil(input.pieces.length / 2);
  const listFont = sans(f.listFont);
  const listTop = f.listBottom - rows * f.listRow;
  const colX = [m, m + f.listColumnWidth + 24];
  const entries: ListEntry[] = input.pieces.map((p, i) => {
    const col = i < rows ? 0 : 1;
    const num = String(p.n);
    const labelX = colX[col] + measure(`${num}  `, listFont);
    const label = wrapLines(p.label, f.listColumnWidth - (labelX - colX[col]), listFont, measure, 1).lines[0];
    return { n: p.n, num, label, x: colX[col], labelX, y: listTop + ((col === 0 ? i : i - rows) + 1) * f.listRow };
  });

  const stageTop = cursor + 40;
  const stage: Rect = { x: f.frameInset + 3, y: stageTop, w: f.stageRight - (f.frameInset + 3), h: listTop - 24 - stageTop };
  return {
    width: f.w, height: f.h,
    frame: { x: f.frameInset, y: f.frameInset, w: f.w - 2 * f.frameInset, h: f.h - 2 * f.frameInset },
    grain: true,
    mark: { x: m, y: f.top, size: f.markSize },
    wordmark: { x: m + f.markSize + 20, y: f.top + f.markSize * 0.72, font: serif(Math.round(f.markSize * 0.7)) },
    kicker: { x: f.w - m, y: f.top + f.markSize * 0.66, font: sans(Math.round(f.footerFont * 1.05), 500, true), text: input.kicker, align: "right" },
    title, why, stage,
    pieces: placePieces(stage, input.pieces, true),
    list: { font: listFont, entries },
    footer: { font: sans(f.footerFont, 400, true), x: f.w - m, y: f.footerY, text: input.footer ?? "fitcheck.space", align: "right" },
  };
}

function preview(input: CardInput, measure: Measure): CardLayout {
  const left = 640;
  const t = fit(input.title, 520, [80, 68, 58], (s) => serif(s), measure, 2, () => 0);
  const titleTop = 196;
  const titleLH = t.font.size * 0.98;
  const why = input.why ? whyBlock(input.why, left, titleTop + titleLH * t.lines.length + 22, 520, [30, 27, 24], 3, measure).block : null;
  const stage: Rect = { x: 0, y: 0, w: 600, h: 630 };
  return {
    width: 1200, height: 630, frame: null, grain: false,
    mark: { x: left, y: 60, size: 44 },
    wordmark: { x: left + 60, y: 92, font: serif(30) },
    kicker: { x: left, y: 160, font: sans(20, 500, true), text: input.kicker, align: "left" },
    title: { x: left - 4, y: titleTop, font: t.font, lineHeight: titleLH, lines: t.lines, firstLineIndent: 0 },
    why, stage,
    pieces: placePieces(stage, input.pieces, false),
    list: null,
    footer: { font: sans(20, 400, true), x: 1160, y: 590, text: input.footer ?? "fitcheck.space", align: "right" },
  };
}

export function layoutCard(target: CardTarget, input: CardInput, measure: Measure): CardLayout {
  return target === "preview" ? preview(input, measure) : stacked(target, input, measure);
}
