import imageCompression from "browser-image-compression";
import { removeBackground } from "@imgly/background-removal";
import { compressionOptions } from "./options";

/** Browser-only: compress, then cut out the background on-device. */
export async function processImage(
  file: File,
): Promise<{ original: Blob; cutout: Blob }> {
  const original = await imageCompression(file, compressionOptions());
  const cutout = await removeBackground(original); // @imgly WASM, on-device
  return { original, cutout };
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
