export type CutoutMediaType = "image/webp" | "image/png";
export type EncodedCutout = { blob: Blob; mediaType: CutoutMediaType };

/**
 * Quality for the single WebP pass.
 *
 * One pass at 0.85 is visually indistinguishable at closet-grid and flat-lay
 * sizes. It is deliberately not lower: this same blob is sent to Haiku for
 * tagging, and Anthropic's vision guidance warns that heavy compression
 * introduces artefacts that hurt model accuracy.
 */
const WEBP_QUALITY = 0.85;

/** Browser-only. Preserves alpha — the canvas is never filled. */
async function canvasWebp(source: Blob): Promise<Blob | null> {
  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/webp", WEBP_QUALITY));
}

/**
 * Re-encode a cutout to WebP, falling back to the original PNG whenever WebP
 * is unavailable, unsupported, or simply not smaller.
 *
 * The cutout is the image users actually see — `displayPath()` prefers it — yet
 * it was the one blob in the pipeline never compressed, arriving larger than
 * the JPEG original it came from.
 */
export async function encodeCutout(
  png: Blob,
  encode: (b: Blob) => Promise<Blob | null> = canvasWebp,
): Promise<EncodedCutout> {
  try {
    const webp = await encode(png);
    // Trust the RESULT, not the request: some engines return PNG regardless.
    if (webp && webp.type === "image/webp" && webp.size < png.size) {
      return { blob: webp, mediaType: "image/webp" };
    }
  } catch {
    // fall through — a cutout that cannot be re-encoded is still a valid cutout
  }
  return { blob: png, mediaType: "image/png" };
}

export function cutoutFilename(mediaType: CutoutMediaType): string {
  return mediaType === "image/webp" ? "cutout.webp" : "cutout.png";
}
