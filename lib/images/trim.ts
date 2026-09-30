/**
 * Crop a cutout to the garment.
 *
 * ⚠️ `segment()` returns a PNG the size of the PHOTO, with the background made transparent. Every surface renders
 * that canvas with `object-contain`, so the empty margin shrinks the garment: measured over the 39 test photos, the
 * median garment rendered 1.28× smaller than it could (1.93× at worst), and pieces in one look came out at mismatched
 * scales. Trimming once at capture fixes the stored cutout, its thumbnail and the image sent for tagging together.
 */
export type Pixels = { data: Uint8ClampedArray; width: number; height: number };
export type Rect = { x: number; y: number; width: number; height: number };

/** Below this alpha a pixel is matte noise, not garment (the landing assets use the same floor). */
const ALPHA_FLOOR = 24;
/** Breathing room around the garment, as a share of its longer side, so drop shadows and rotation never clip it. */
const PAD = 0.02;

/** The garment's tight bounding box (no border); null when nothing is opaque. */
function garmentBox({ data, width, height }: Pixels): Rect | null {
  let top = height, left = width, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > ALPHA_FLOOR) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  return right < 0 ? null : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

/** The garment's bounding box plus the border, clamped to the canvas; null when nothing is opaque. */
export function alphaBounds(p: Pixels): Rect | null {
  const g = garmentBox(p);
  if (!g) return null;
  const pad = Math.round(Math.max(g.width, g.height) * PAD);
  const x = Math.max(0, g.x - pad), y = Math.max(0, g.y - pad);
  return {
    x,
    y,
    width: Math.min(p.width - 1, g.x + g.width - 1 + pad) - x + 1,
    height: Math.min(p.height - 1, g.y + g.height - 1 + pad) - y + 1,
  };
}

/** Browser-only: decode a blob to RGBA pixels. */
async function readPixels(blob: Blob): Promise<Pixels> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { data, width: canvas.width, height: canvas.height };
}

/** Browser-only: copy a region into a new PNG. The canvas is never filled, so alpha survives. */
async function cropToPng(blob: Blob, r: Rect): Promise<Blob | null> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = r.width;
  canvas.height = r.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, r.x, r.y, r.width, r.height, 0, 0, r.width, r.height);
  bitmap.close?.();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

/**
 * The cutout cropped to the garment. Returns the input unchanged when it is already tight, empty, or when anything
 * fails — a trim is an improvement, never a reason for a capture to fail.
 */
export async function trimCutout(
  png: Blob,
  deps: { read: (b: Blob) => Promise<Pixels>; crop: (b: Blob, r: Rect) => Promise<Blob | null> } = { read: readPixels, crop: cropToPng },
): Promise<Blob> {
  try {
    const pixels = await deps.read(png);
    const box = alphaBounds(pixels);
    if (!box || (box.width === pixels.width && box.height === pixels.height)) return png;
    return (await deps.crop(png, box)) ?? png;
  } catch {
    return png;
  }
}

/** A margin above this share of the longer side means the cutout was stored untrimmed (capture now leaves ~2%). */
const UNTRIMMED = 0.03;

/**
 * For stored cutouts (the backfill): the crop, or null when it is empty or already cropped. The 3% bar sits above
 * capture's own 2% border, so a cutout trimmed at capture — or by an earlier run — is never cropped again.
 */
export function needsTrim(p: Pixels): Rect | null {
  const g = garmentBox(p);
  if (!g) return null;
  const widest = Math.max(g.x, g.y, p.width - g.x - g.width, p.height - g.y - g.height);
  return widest / Math.max(p.width, p.height) > UNTRIMMED ? alphaBounds(p) : null;
}
