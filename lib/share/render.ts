import { CARD_SIZES, layoutCard, type CardInput, type CardTarget, type FontSpec } from "./card-layout";
import { cssFont, encodeWithinBudget, paintCard, type Fonts } from "./draw";

/** next/font renames the faces; the real family lists live in the root CSS variables (app/[locale]/layout.tsx). */
export async function loadFonts(): Promise<Fonts> {
  const root = getComputedStyle(document.documentElement);
  const fonts = {
    serif: root.getPropertyValue("--font-libre-caslon").trim() || "Georgia, serif",
    sans: root.getPropertyValue("--font-hanken").trim() || "system-ui, sans-serif",
  };
  await Promise.all([
    document.fonts.load(`400 40px ${fonts.serif}`), document.fonts.load(`italic 400 40px ${fonts.serif}`),
    document.fonts.load(`400 28px ${fonts.sans}`), document.fonts.load(`500 28px ${fonts.sans}`),
  ]);
  return fonts;
}

export async function loadImages(pieces: { n: number; url: string }[]): Promise<Map<number, HTMLImageElement | null>> {
  return new Map(await Promise.all(pieces.map(async (p) => {
    if (!p.url) return [p.n, null] as const;
    const img = new Image();
    img.crossOrigin = "anonymous"; // signed Storage URLs send CORS headers; without this the canvas taints
    img.src = p.url;
    try { await img.decode(); return [p.n, img] as const; } catch { return [p.n, null] as const; }
  })));
}

export async function renderCard(target: CardTarget, input: CardInput, images: Map<number, HTMLImageElement | null>, fonts: Fonts): Promise<Blob> {
  const { w, h } = CARD_SIZES[target];
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const measure = (text: string, font: FontSpec) => { ctx.font = cssFont(font, fonts); return ctx.measureText(text).width; };
  paintCard(ctx, layoutCard(target, input, measure), images, fonts);
  const encode = (q: number) => new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("SHARE_ENCODE"))), "image/jpeg", q);
    } catch (e) {
      reject(e instanceof DOMException && e.name === "SecurityError" ? new Error("SHARE_TAINTED") : e);
    }
  });
  try {
    // WhatsApp drops preview images over ~300 KB; story/post stay under the 3 MiB bucket limit.
    return await encodeWithinBudget(encode, target === "preview" ? 290_000 : 2_500_000);
  } finally {
    canvas.width = canvas.height = 0; // free the ~2 MP backing store at once (iOS canvas memory)
  }
}
