import type { Rotation } from "@/lib/ai/tagging-schema";

export function rotatedSize(width: number, height: number, rotation: Rotation) {
  return rotation % 180 === 0 ? { width, height } : { width: height, height: width };
}

/** Quarter-turn rotation of RGBA pixels, clockwise. Exact: no resampling. */
export function rotateRGBA(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  rotation: Rotation,
): { data: Uint8ClampedArray<ArrayBuffer>; width: number; height: number } {
  if (rotation === 0) return { data: new Uint8ClampedArray(data), width, height };
  const { width: w2, height: h2 } = rotatedSize(width, height, rotation);
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let nx: number, ny: number;
      if (rotation === 90) { nx = height - 1 - y; ny = x; }
      else if (rotation === 180) { nx = width - 1 - x; ny = height - 1 - y; }
      else { nx = y; ny = width - 1 - x; }
      const s = (y * width + x) * 4, d = (ny * w2 + nx) * 4;
      out[d] = data[s]; out[d + 1] = data[s + 1]; out[d + 2] = data[s + 2]; out[d + 3] = data[s + 3];
    }
  }
  return { data: out, width: w2, height: h2 };
}

/** Browser-only. Returns a PNG so alpha and pixels are untouched; encode afterwards. */
export async function rotateBlob(source: Blob, rotation: Rotation): Promise<Blob> {
  if (rotation === 0) return source;
  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  const src = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const r = rotateRGBA(src.data, src.width, src.height, rotation);
  canvas.width = r.width;
  canvas.height = r.height;
  ctx.putImageData(new ImageData(r.data, r.width, r.height), 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Rotate failed"))), "image/png"),
  );
}
