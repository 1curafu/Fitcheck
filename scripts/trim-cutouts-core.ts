import sharp from "sharp";
import { THUMB_MAX_PX } from "../lib/images/options";
import { needsTrim } from "../lib/images/trim";

/**
 * Crop one stored cutout to its garment and rebuild its thumbnail from the result (scripts/backfill-trim-cutouts.ts).
 * Same crop rule as capture (`lib/images/trim.ts`); the format follows the stored path so the row never changes.
 * Returns null when the cutout is empty or already cropped.
 */
export async function trimStoredCutout(
  source: Buffer,
  cutoutPath: string,
  thumbPath: string | null,
): Promise<{ cutout: Buffer; thumb: Buffer | null } | null> {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const box = needsTrim({ data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), width: info.width, height: info.height });
  if (!box) return null;

  const cropped = sharp(source).extract({ left: box.x, top: box.y, width: box.width, height: box.height });
  // 85 matches the browser's WebP pass (lib/images/encode.ts); PNG stays lossless.
  const cutout = cutoutPath.endsWith(".png") ? await cropped.png().toBuffer() : await cropped.webp({ quality: 85 }).toBuffer();

  let thumb: Buffer | null = null;
  if (thumbPath) {
    // Same box and settings as scripts/backfill-thumbs.ts; never upscale, never add a background.
    const shrunk = sharp(cutout).resize(THUMB_MAX_PX, THUMB_MAX_PX, { fit: "inside", withoutEnlargement: true });
    thumb = thumbPath.endsWith(".png") ? await shrunk.png().toBuffer() : await shrunk.webp({ quality: 80 }).toBuffer();
  }
  return { cutout, thumb };
}
