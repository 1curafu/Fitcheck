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

/** Uploads one object; resolves to an error message, or null on success. Injected so the write ORDER is testable. */
export type Upload = (path: string, body: Buffer, contentType: string) => Promise<{ message: string } | null>;

const contentType = (path: string) => (path.endsWith(".png") ? "image/png" : "image/webp");

/**
 * Write a trimmed cutout and its thumbnail — THUMBNAIL FIRST.
 *
 * ⚠️ The order is the point (reviewer finding on #129). Closet and calendar tiles prefer `thumb_url` over the cutout,
 * and a rerun decides "already trimmed?" from the CUTOUT alone. Cutout-first meant a stop between the two writes left a
 * tight cutout with the old padded thumbnail: a rerun saw the tight cutout, skipped the row, and the tile stayed
 * mis-scaled for good. Thumbnail-first means the worst interrupted state is a tight thumbnail beside a still-padded
 * cutout, which a rerun detects and simply redoes.
 */
export async function storeTrimmed(
  upload: Upload,
  paths: { cutout: string; thumb: string | null },
  out: { cutout: Buffer; thumb: Buffer | null },
): Promise<void> {
  if (paths.thumb && out.thumb) {
    const t = await upload(paths.thumb, out.thumb, contentType(paths.thumb));
    if (t) throw new Error(`uploading ${paths.thumb} failed: ${t.message}`);
  }
  const c = await upload(paths.cutout, out.cutout, contentType(paths.cutout));
  if (c) throw new Error(`uploading ${paths.cutout} failed: ${c.message}`);
}

export type Verdict = { status: "ok" | "unchanged" | "padded" | "unreadable"; width?: number; height?: number };

/**
 * What is the STORED cutout after the upload?
 *
 * Reads through the injected `read` (the script passes a fresh-signed-URL reader, because the authenticated `download()`
 * can be served from Supabase's CDN cache right after an overwrite). Distinguishes the outcomes the owner needs to tell
 * apart: `ok` (cropped), `unchanged` (the stored object still has the pre-upload dimensions — the upload has not become
 * visible, a stale read or a failed write), `padded` (changed but still carrying its margin) and `unreadable`.
 */
export async function verifyTrimmed(
  read: (path: string) => Promise<Buffer | null>,
  path: string,
  before: { width: number; height: number },
): Promise<Verdict> {
  // ⚠️ Never throws: a rejected network read or a body that is not an image (an error page, a truncated response) is
  // "unreadable" — a per-row outcome the retry loop and the failure list handle — not an exception that aborts the run.
  let decoded: { data: Buffer; info: { width: number; height: number } };
  try {
    const stored = await read(path);
    if (!stored) return { status: "unreadable" };
    decoded = await sharp(stored).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  } catch {
    return { status: "unreadable" };
  }
  const { data, info } = decoded;
  const dims = { width: info.width, height: info.height };
  if (!needsTrim({ data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), ...dims })) return { status: "ok", ...dims };
  return { status: dims.width === before.width && dims.height === before.height ? "unchanged" : "padded", ...dims };
}
