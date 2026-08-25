export type ThumbMediaType = "image/webp" | "image/png";
export type EncodedThumb = { blob: Blob; mediaType: ThumbMediaType };

/**
 * Quality for the thumbnail pass.
 *
 * ⚠️ Deliberately lossier than `encode.ts`'s 0.85, and that is safe **only
 * because nothing but human eyes ever reads this blob.** The full cutout is
 * held at 0.85 because Haiku tags it and compression artefacts cost accuracy;
 * the thumbnail is never sent to the model, never zoomed, and is rendered at
 * 45–160 CSS px. Do not "unify" the two constants.
 */
const THUMB_QUALITY = 0.8;

/**
 * A derivative must be at least this much smaller than its source to be stored
 * at all. Below that it is pure cost — client CPU, a storage object, a column
 * and a second signed URL — for bytes nobody saves (Decision 4).
 */
const MATERIAL_GAIN = 0.8;

/**
 * Scale to fit inside a `maxPx` box, preserving the aspect ratio.
 *
 * Caps the LONGEST side rather than the width, because the images are rendered
 * `object-contain`: a tall coat is height-constrained in the closet grid and
 * wide shoes are width-constrained, so a width-only cap would leave the tall
 * case oversized and still cost the bytes.
 */
export function fitWithin(
  width: number,
  height: number,
  maxPx: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  // Never upscale: a source already smaller than the box is left alone, so a
  // small image can never be made heavier by "shrinking" it.
  const scale = Math.min(1, maxPx / longest);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Size the canvas and draw the source into it.
 *
 * ⚠️ **The canvas is never filled.** A cutout is transparent by construction and
 * floats on the app's dark surfaces; painting any background here would put a
 * white matte behind every garment — a change that looks perfect in a byte
 * count and ruins every screen it touches. Extracted so a test can pin it.
 */
export function drawScaled(
  source: { width: number; height: number },
  canvas: { width: number; height: number },
  ctx: Pick<CanvasRenderingContext2D, "drawImage">,
  maxPx: number,
): void {
  const { width, height } = fitWithin(source.width, source.height, maxPx);
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);
}

/**
 * Browser-only. Tries WebP, then PNG.
 *
 * The PNG second attempt is not belt-and-braces: `encode.ts` documents that some
 * engines simply fail at WebP, and a 480px PNG is still a fraction of a 1280px
 * cutout. Losing the thumbnail entirely on those browsers would leave exactly
 * the users on the weakest engines paying the most bytes.
 */
async function canvasThumb(source: Blob, maxPx: number): Promise<Blob | null> {
  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  drawScaled(bitmap, canvas, ctx, maxPx);
  bitmap.close?.();

  const webp = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/webp", THUMB_QUALITY),
  );
  if (webp?.type === "image/webp") return webp;

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

/**
 * Produce a small derivative of an already-processed cutout, or `null` when
 * there is no worthwhile one.
 *
 * ⚠️ **`null` is a real answer, not an error.** Unlike `encodeCutout` — which
 * must return *something*, because the cutout is the image users see — a
 * missing thumbnail is harmless: `displayPath(item, "thumb")` falls through to
 * the cutout, which is the same path every pre-existing row takes. So an engine
 * without a working canvas encoder degrades to today's behaviour instead of
 * failing an upload the user has already waited on.
 */
export async function encodeThumb(
  source: Blob,
  maxPx: number,
  encode: (b: Blob, maxPx: number) => Promise<Blob | null> = canvasThumb,
): Promise<EncodedThumb | null> {
  try {
    const thumb = await encode(source, maxPx);
    if (!thumb) return null;
    // Trust the RESULT, not the request — the same lesson `encode.ts` records:
    // some engines hand back a different format than the one asked for.
    if (thumb.type !== "image/webp" && thumb.type !== "image/png") return null;
    if (thumb.size >= source.size * MATERIAL_GAIN) return null;
    return { blob: thumb, mediaType: thumb.type };
  } catch {
    // A cutout that cannot be shrunk is still a perfectly good cutout.
    return null;
  }
}

export function thumbFilename(mediaType: ThumbMediaType): string {
  return mediaType === "image/webp" ? "thumb.webp" : "thumb.png";
}
