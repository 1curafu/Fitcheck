import type { CardLayout, FontSpec } from "./card-layout";

export type Fonts = { serif: string; sans: string };
type Img = CanvasImageSource & { width: number; height: number };

// Midnight Atelier tokens (DESIGN.md).
const C = { canvas: "#0E0E10", s1: "#161517", s3: "#201F22", cream: "#EDE6D8", creamStrong: "#F3EEE3",
  muted: "#928C7F", list: "#C8C1B3", rust: "#B86A47", hairline: "rgba(237,230,216,0.12)" };

export function cssFont(f: FontSpec, fonts: Fonts): string {
  return `${f.italic ? "italic " : ""}${f.weight ?? 400} ${f.size}px ${f.family === "serif" ? fonts.serif : fonts.sans}`;
}

function setFont(ctx: CanvasRenderingContext2D, f: FontSpec, fonts: Fonts) {
  ctx.font = cssFont(f, fonts);
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = f.caps ? `${Math.round(f.size * 0.18)}px` : "0px";
}

/** The Fitcheck mark (public/brand/fitcheck-mark.svg geometry on its 32-unit grid). */
function paintMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 32, size / 32);
  ctx.beginPath();
  ctx.roundRect(1.6, 1.6, 28.8, 28.8, 8.4);
  ctx.fillStyle = C.s1;
  ctx.fill();
  ctx.strokeStyle = "rgba(237,230,216,0.14)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = C.cream;
  ctx.lineWidth = 2.1;
  ctx.stroke(new Path2D("M9.2 24V9.6C9.2 7.6 10.7 6 12.8 6h3.4"));
  ctx.stroke(new Path2D("M6.9 14.4h7.4"));
  ctx.strokeStyle = C.rust;
  ctx.lineWidth = 2.4;
  ctx.stroke(new Path2D("m19.4 18.6 2.9 3 4.1-6.6"));
  ctx.restore();
}

let grainTile: HTMLCanvasElement | null = null;
function grain(): HTMLCanvasElement {
  if (grainTile) return grainTile;
  const tile = document.createElement("canvas");
  tile.width = tile.height = 160;
  const g = tile.getContext("2d")!;
  const img = g.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return (grainTile = tile);
}

export function paintCard(ctx: CanvasRenderingContext2D, layout: CardLayout, images: Map<number, Img | null>, fonts: Fonts): void {
  const { width: W, height: H } = layout;
  ctx.fillStyle = C.canvas;
  ctx.fillRect(0, 0, W, H);

  const s = layout.stage;
  const glow = ctx.createRadialGradient(s.x + s.w / 2, s.y + s.h / 2, 0, s.x + s.w / 2, s.y + s.h / 2, Math.max(s.w, s.h) * 0.62);
  glow.addColorStop(0, C.s3);
  glow.addColorStop(0.55, "#151416");
  glow.addColorStop(1, C.canvas);
  ctx.fillStyle = glow;
  ctx.fillRect(s.x, s.y, s.w, s.h);

  for (const p of [...layout.pieces].sort((a, b) => a.z - b.z)) {
    const img = images.get(p.n);
    if (!img) continue;
    const k = Math.min(p.rect.w / img.width, p.rect.h / img.height);
    ctx.save();
    ctx.translate(p.rect.x + p.rect.w / 2, p.rect.y + p.rect.h / 2);
    ctx.rotate((p.rotationDeg * Math.PI) / 180);
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = Math.round(W * 0.034);
    ctx.shadowOffsetY = Math.round(W * 0.026);
    ctx.drawImage(img, (-img.width * k) / 2, (-img.height * k) / 2, img.width * k, img.height * k);
    ctx.restore();
  }

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  setFont(ctx, { family: "sans", size: Math.round(W * 0.022) }, fonts);
  ctx.fillStyle = C.muted;
  for (const p of layout.pieces) if (p.numeral && images.get(p.n)) ctx.fillText(String(p.n), p.numeral.x, p.numeral.y);

  if (layout.frame) {
    ctx.beginPath();
    ctx.roundRect(layout.frame.x, layout.frame.y, layout.frame.w, layout.frame.h, Math.round(W * 0.045));
    ctx.strokeStyle = C.hairline;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  paintMark(ctx, layout.mark.x, layout.mark.y, layout.mark.size);
  setFont(ctx, layout.wordmark.font, fonts);
  ctx.fillStyle = C.cream;
  ctx.fillText("fitcheck", layout.wordmark.x, layout.wordmark.y);

  setFont(ctx, layout.kicker.font, fonts);
  ctx.fillStyle = C.muted;
  ctx.textAlign = layout.kicker.align;
  ctx.fillText(layout.kicker.text.toUpperCase(), layout.kicker.x, layout.kicker.y);
  ctx.textAlign = "left";

  setFont(ctx, layout.title.font, fonts);
  ctx.fillStyle = C.creamStrong;
  layout.title.lines.forEach((line, i) =>
    ctx.fillText(line, layout.title.x, layout.title.y + layout.title.lineHeight * (i + 1) - layout.title.font.size * 0.18));

  if (layout.why) {
    const w = layout.why;
    setFont(ctx, w.glyph.font, fonts);
    ctx.fillStyle = C.rust;
    ctx.fillText("f", w.glyph.x, w.y + w.lineHeight * 0.8);
    setFont(ctx, w.font, fonts);
    ctx.fillStyle = C.cream;
    w.lines.forEach((line, i) => ctx.fillText(line, w.x + (i === 0 ? w.firstLineIndent : 0), w.y + w.lineHeight * (i + 0.8)));
  }

  if (layout.list) {
    setFont(ctx, layout.list.font, fonts);
    for (const e of layout.list.entries) {
      ctx.fillStyle = C.muted;
      ctx.fillText(e.num, e.x, e.y);
      ctx.fillStyle = C.list;
      ctx.fillText(e.label, e.labelX, e.y);
    }
  }

  setFont(ctx, layout.footer.font, fonts);
  ctx.fillStyle = C.muted;
  ctx.textAlign = layout.footer.align;
  ctx.fillText(layout.footer.text.toUpperCase(), layout.footer.x, layout.footer.y);

  if (layout.grain) {
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = ctx.createPattern(grain(), "repeat")!;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

export async function encodeWithinBudget(encode: (q: number) => Promise<Blob>, budget: number,
  qualities = [0.9, 0.84, 0.78, 0.7, 0.62]): Promise<Blob> {
  let last: Blob | null = null;
  for (const q of qualities) {
    last = await encode(q);
    if (last.size <= budget) return last;
  }
  return last!;
}
