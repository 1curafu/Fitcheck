import { C, encodeWithinBudget, grain, paintMark, setFont, type Fonts } from "@/lib/share/draw";
import { DNA_CARD, layoutDnaCard, type DnaCardInput } from "./card";

/** Browser-only: draws the Style DNA Story and encodes it under the share budget. */
export async function renderDnaCard(input: DnaCardInput, fonts: Fonts): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = DNA_CARD.w;
  canvas.height = DNA_CARD.h;
  const ctx = canvas.getContext("2d")!;
  const layout = layoutDnaCard(input, (text, font) => { setFont(ctx, font, fonts); return ctx.measureText(text).width; });

  ctx.fillStyle = C.canvas;
  ctx.fillRect(0, 0, DNA_CARD.w, DNA_CARD.h);
  const f = layout.frame;
  const glow = ctx.createRadialGradient(f.x + f.w * 0.82, f.y + f.h * 0.08, 0, f.x + f.w * 0.82, f.y + f.h * 0.08, f.w * 1.2);
  glow.addColorStop(0, "#241d18");
  glow.addColorStop(1, C.s1);
  ctx.beginPath();
  ctx.roundRect(f.x, f.y, f.w, f.h, 40);
  ctx.fillStyle = glow;
  ctx.fill();
  ctx.strokeStyle = C.hairline;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textBaseline = "alphabetic";
  paintMark(ctx, layout.mark.x, layout.mark.y, layout.mark.size);
  setFont(ctx, layout.wordmark.font, fonts);
  ctx.fillStyle = C.cream;
  ctx.fillText("fitcheck", layout.wordmark.x, layout.wordmark.y);
  setFont(ctx, layout.kicker.font, fonts);
  ctx.fillStyle = C.muted;
  ctx.textAlign = "right";
  ctx.fillText(layout.kicker.text.toUpperCase(), layout.kicker.x, layout.kicker.y);
  ctx.textAlign = "left";

  setFont(ctx, layout.label.font, fonts);
  ctx.fillStyle = C.rust;
  ctx.fillText(layout.label.text.toUpperCase(), layout.label.x, layout.label.y);
  for (const block of [layout.title, layout.blurb]) {
    setFont(ctx, block.font, fonts);
    ctx.fillStyle = block === layout.title ? C.creamStrong : C.list;
    // maxWidth squeezes a word that is wider than the card at the smallest size instead of clipping it.
    block.lines.forEach((line, i) => ctx.fillText(line, block.x, block.y + block.lineHeight * (i + 0.8), DNA_CARD.w - 2 * block.x));
  }

  for (const s of layout.swatches) {
    ctx.beginPath();
    ctx.roundRect(s.x, s.y, s.w, s.h, 16);
    ctx.fillStyle = s.hex;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.stroke();
    setFont(ctx, layout.swatchFont, fonts);
    ctx.fillStyle = C.muted;
    ctx.textAlign = "center";
    ctx.fillText(s.label.toUpperCase(), s.x + s.w / 2, s.labelY, s.w + 16);
    ctx.textAlign = "left";
  }

  for (const s of layout.stats) {
    setFont(ctx, layout.statValueFont, fonts);
    ctx.fillStyle = C.creamStrong;
    ctx.fillText(s.value, s.x, s.y);
    setFont(ctx, layout.statLabelFont, fonts);
    ctx.fillStyle = C.muted;
    ctx.fillText(s.label.toUpperCase(), s.x, s.labelY, 280);
  }
  ctx.fillStyle = C.hairline;
  ctx.fillRect(layout.footer.x, layout.divider, DNA_CARD.w - 2 * layout.footer.x, 2);
  setFont(ctx, layout.footer.font, fonts);
  ctx.fillStyle = C.muted;
  ctx.fillText(layout.footer.text.toUpperCase(), layout.footer.x, layout.footer.y);

  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = ctx.createPattern(grain(), "repeat")!;
  ctx.fillRect(0, 0, DNA_CARD.w, DNA_CARD.h);
  ctx.restore();

  const encode = (q: number) => new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("SHARE_ENCODE"))), "image/jpeg", q));
  try {
    return await encodeWithinBudget(encode, 2_500_000);
  } finally {
    canvas.width = canvas.height = 0; // free the backing store at once (iOS canvas memory)
  }
}
