import imageCompression from "browser-image-compression";
import { removeBackground } from "@imgly/background-removal";
import { compressionOptions } from "./options";
import { encodeCutout, type CutoutMediaType } from "./encode";

/** Browser-only: compress, cut out the background on-device, then compress the cutout. */
export async function processImage(
  file: File,
): Promise<{ original: Blob; cutout: Blob; cutoutMediaType: CutoutMediaType }> {
  const original = await imageCompression(file, compressionOptions());
  const raw = await removeBackground(original); // @imgly WASM, on-device
  // @imgly hands back an uncompressed PNG. It is the blob users actually see
  // (displayPath prefers the cutout), so it gets compressed too.
  const { blob: cutout, mediaType: cutoutMediaType } = await encodeCutout(raw);
  return { original, cutout, cutoutMediaType };
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
