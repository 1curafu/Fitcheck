import { minMaxNormalise } from "./mask-metrics";

/**
 * ⚠️ Loaded lazily, never at module scope. onnxruntime-web computes its worker
 * URL from `import.meta.url` the moment it is evaluated, and this module is in
 * the import graph of a client component that Next renders on the server too —
 * every SSR of the capture page logged "TypeError: Invalid URL". A dynamic
 * import runs only in the browser, on first use, and keeps the runtime out of
 * the server bundle entirely.
 *
 * The `/wasm` entry, not the default: the default bundle includes WebGPU and
 * fetches the 28 MB JSEP runtime; this one loads the 14 MB WASM-only runtime,
 * which is all a 320px u2netp needs.
 */
type Ort = typeof import("onnxruntime-web/wasm");
let ortModule: Promise<Ort> | null = null;
function ort(): Promise<Ort> {
  ortModule ??= import("onnxruntime-web/wasm");
  return ortModule;
}
let wasmPaths = "/ort/";

/**
 * Background removal we own: decode → preprocess → ONNX → postprocess.
 *
 * Replaces `@imgly/background-removal` (AGPL-3.0, and 88 MB of DIS5K-trained
 * weights on first run). `onnxruntime-web` is MIT; the model is a parameter so
 * a swap is a config change, which is how this shipped with u2netp rather than
 * the ISNet the plan was first written for.
 *
 * ⚠️ Preprocessing is where a rewrite like this goes wrong, and every mistake is
 * invisible to a type system: normalisation, channel order, layout, output
 * selection all produce plausible, uniformly worse masks rather than a crash.
 * The parity harness (`scripts/cutout-harness`) measures this pipeline against
 * the library it replaces, per image, and that table is the acceptance test.
 */
export type SegmentModel = {
  url: string;
  inputSize: number;
  mean: readonly [number, number, number];
  std: readonly [number, number, number];
};

/**
 * U²-Net "p" — the small variant. Apache-2.0 weights from the official
 * checkpoint (xuebinqin/U-2-Net, u2netp.pth, sha256 e7567cde…), trained on
 * DUTS-TR, which carries no non-commercial clause. Exported to ONNX by us
 * (`scratch/export/export.py`, dynamic spatial axes, opset 17; sha256 d6811788…)
 * and verified to reproduce a third-party conversion to four decimals at 320.
 * Constants are U²-Net's published normalisation. Served from our own origin.
 *
 * ⚠️ `inputSize` is NOT a quality dial. The export accepts any size, but the
 * network was trained at 320 and its coverage collapses above it — measured at
 * 512 and 640 on real photos, where a pair of trousers went from 0.74 to 0.06.
 */
export const U2NETP: SegmentModel = {
  url: "/models/u2netp.onnx",
  inputSize: 320,
  mean: [0.485, 0.456, 0.406],
  std: [0.229, 0.224, 0.225],
};

/** RGBA pixels → NCHW float tensor data, RGB, per-channel normalised. Alpha is ignored. */
export function toModelInput(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  { mean, std }: Pick<SegmentModel, "mean" | "std">,
): Float32Array {
  const plane = width * height;
  const out = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    out[i] = (rgba[i * 4] / 255 - mean[0]) / std[0];
    out[plane + i] = (rgba[i * 4 + 1] / 255 - mean[1]) / std[1];
    out[2 * plane + i] = (rgba[i * 4 + 2] / 255 - mean[2]) / std[2];
  }
  return out;
}

type Session = Awaited<ReturnType<Ort["InferenceSession"]["create"]>>;

// ⚠️ One session per model, for the life of the page. Onboarding captures five
// items in a row; creating the session each time would pay the WASM setup five
// times over.
const sessions = new Map<string, Promise<Session>>();

function sessionFor(model: SegmentModel): Promise<Session> {
  let s = sessions.get(model.url);
  if (!s) {
    s = ort().then((o) => {
      o.env.wasm.wasmPaths = wasmPaths;
      return o.InferenceSession.create(model.url, { executionProviders: ["wasm"] });
    });
    sessions.set(model.url, s);
  }
  return s;
}

/** Where the runtime's .wasm lives. Ours, so no third party is fetched at runtime. */
export function configureRuntime(paths = "/ort/") {
  wasmPaths = paths;
}

async function decode(source: Blob): Promise<ImageBitmap> {
  return createImageBitmap(source);
}

function draw(bitmap: ImageBitmap, w: number, h: number): OffscreenCanvas {
  const c = new OffscreenCanvas(w, h);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return c;
}

/**
 * The alpha mask for `source`, at the source's resolution (or `at`), as an ImageData
 * whose alpha channel is the mask. Exposed separately because it is the seam
 * every future quality fix needs — hole filling, feathering, thresholding —
 * none of which were possible when the library handed back a composited PNG.
 */
export async function segmentMask(
  source: Blob,
  model: SegmentModel,
  at?: { width: number; height: number },
): Promise<ImageData> {
  const bitmap = await decode(source);
  const width = at?.width ?? bitmap.width;
  const height = at?.height ?? bitmap.height;
  const n = model.inputSize;

  const small = draw(bitmap, n, n);
  const pixels = small.getContext("2d")!.getImageData(0, 0, n, n).data;
  const session = await sessionFor(model);
  const input = new (await ort()).Tensor("float32", toModelInput(pixels, n, n, model), [1, 3, n, n]);
  const outputs = await session.run({ [session.inputNames[0]]: input });
  // ⚠️ The FIRST output. U²-Net emits seven side outputs; d0 is the fused one.
  // Taking d6 instead still LOOKS like a mask — measured 0.9384 against 0.9848.
  const raw = outputs[session.outputNames[0]].data as Float32Array;
  // A no-op for u2netp in practice (its output is already 0..1; a sweep could
  // not tell the difference), kept as rembg keeps it: a swapped-in model whose
  // output is not 0..1 would otherwise write garbage alpha without a crash.
  const mask = minMaxNormalise(raw.subarray(0, n * n));

  // Mask → an n×n alpha image, then resized to the source with the canvas's
  // bilinear filter, exactly as the mask must scale.
  const maskImage = new ImageData(n, n);
  for (let i = 0; i < n * n; i++) {
    maskImage.data[i * 4] = 255;
    maskImage.data[i * 4 + 1] = 255;
    maskImage.data[i * 4 + 2] = 255;
    maskImage.data[i * 4 + 3] = Math.round(mask[i] * 255);
  }
  const maskCanvas = new OffscreenCanvas(n, n);
  maskCanvas.getContext("2d")!.putImageData(maskImage, 0, 0);
  const full = new OffscreenCanvas(width, height);
  const fctx = full.getContext("2d")!;
  fctx.imageSmoothingEnabled = true;
  fctx.imageSmoothingQuality = "high";
  fctx.drawImage(maskCanvas, 0, 0, width, height);
  bitmap.close();
  return fctx.getImageData(0, 0, width, height);
}

/**
 * The cutout: `target`'s pixels with the mask written into alpha. PNG, uncompressed.
 *
 * `source` is what the MODEL sees; `target` (default: source) is what gets
 * composited. They differ on purpose in the capture flow: the model samples its
 * 320px from the full-resolution photo, while the cutout is built at the
 * compressed size the app stores — a 12-megapixel original would otherwise
 * become a 48 MB canvas on the phone for a mask that is 320px anyway.
 */
export async function segment(source: Blob, model: SegmentModel, target: Blob = source): Promise<Blob> {
  const bitmap = await decode(target);
  const { width, height } = bitmap;
  const canvas = draw(bitmap, width, height);
  const ctx = canvas.getContext("2d")!;
  const image = ctx.getImageData(0, 0, width, height);
  const mask = await segmentMask(source, model, { width, height });
  for (let i = 3; i < image.data.length; i += 4) image.data[i] = mask.data[i];
  // ⚠️ Never fill the canvas — a white matte behind every garment looks perfect
  // in a byte count and ruins every screen. Same rule as thumb.ts.
  ctx.putImageData(image, 0, 0);
  bitmap.close();
  return canvas.convertToBlob({ type: "image/png" });
}
