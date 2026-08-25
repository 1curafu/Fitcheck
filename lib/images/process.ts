import imageCompression from "browser-image-compression";
import { removeBackground } from "@imgly/background-removal";
import { compressionOptions, THUMB_MAX_PX } from "./options";
import { encodeCutout, type CutoutMediaType } from "./encode";
import { encodeThumb, type ThumbMediaType } from "./thumb";

/**
 * Browser-only: compress, cut out the background on-device, compress the
 * cutout, then derive a small thumbnail from it.
 *
 * The thumbnail is a third `canvas.toBlob` on a device that has just run a WASM
 * segmentation model — a few milliseconds against several seconds, paid ONCE
 * per item ever. That is the same bargain as Decision 2: spend the user's idle
 * CPU once so every later view is free, rather than paying a per-view
 * transformation fee forever.
 *
 * ⚠️ It is derived from the CUTOUT, not the original: the cutout is what every
 * thumbnail surface renders, and it is the one with alpha.
 */
export async function processImage(file: File): Promise<{
  original: Blob;
  cutout: Blob;
  cutoutMediaType: CutoutMediaType;
  thumb: Blob | null;
  thumbMediaType: ThumbMediaType | null;
}> {
  const original = await imageCompression(file, compressionOptions());
  const raw = await removeBackground(original); // @imgly WASM, on-device
  // @imgly hands back an uncompressed PNG. It is the blob users actually see
  // (displayPath prefers the cutout), so it gets compressed too.
  const { blob: cutout, mediaType: cutoutMediaType } = await encodeCutout(raw);

  // `null` when the engine could not produce a materially smaller image. The
  // upload proceeds without one and readers fall through to the cutout.
  const thumb = await encodeThumb(cutout, THUMB_MAX_PX);

  return {
    original,
    cutout,
    cutoutMediaType,
    thumb: thumb?.blob ?? null,
    thumbMediaType: thumb?.mediaType ?? null,
  };
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
