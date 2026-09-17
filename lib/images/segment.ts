import { minMaxNormalise } from "./mask-metrics";
import { guidedFilter, luminance, punchBackground, sharpenAlpha } from "./refine";

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
 * Mask refinement, measured stage by stage on real photos (see refine.ts).
 * `sharpen` runs on the model's own 320px output; `guided` runs at the output
 * resolution with the photo as the guide, its radius a fraction of the longer
 * side so it means the same thing on a 640px screenshot and a 4000px photo.
 */
export type RefineOptions = {
  sharpen?: readonly [lo: number, hi: number];
  /**
   * ⚠️ Measured and rejected on real photos (2026-09-16): at a radius small
   * enough to harm nothing (≈5 px) it gained nothing, and at any useful radius
   * it eroded thin structures — 19–31 regressions, 0 gains. Kept as an option
   * because the primitive is tested and the next model may behave differently;
   * not in the default.
   */
  guided?: { radiusFrac: number; eps: number };
  /**
   * A second pass on the garment's own bounding box. u2netp collapses above
   * 320 px, so the way to give a thin chain or the gap between two trouser
   * legs more pixels is to crop to the object and run at 320 AGAIN — the
   * object fills the frame, the model's sense of scale is untouched.
   * Skipped when the box already covers most of the frame (nothing to gain).
   */
  zoom?: { padFrac: number; maxAreaFrac: number; square?: boolean };
  /** Flood background-coloured kept pixels out from the exterior (refine.ts). `true` = defaults. */
  punch?: true | { tol?: number; maxSpread?: number; maxGarmentShare?: number };
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

/**
 * The refinement that ships, chosen on the parity harness (2026-09-16), every
 * image against the visually correct reference:
 *   stage 0 → sharpen :  under-bar 11 → 10,  worst 0.770 → 0.801, no image regressed.
 *   sharpen → + punch :  white shirt 0.924 → 0.971, black knit's arm gaps cleared, 0 regressed.
 *
 * Two more were built, measured, and do NOT ship:
 * - the guided filter: at a harmless radius it gained nothing, at a useful one
 *   it eroded thin structures — 19–31 regressions, 0 gains;
 * - the zoom pass (square crop): its gain on EVERY image is under the 0.005
 *   tolerance — disabling it on the chain changes nothing the check can see —
 *   for +0.3 s per capture. The squashed variant did more for the chain
 *   (0.817) and cost the black bottle 0.05, a trade the rule forbids.
 * Both stay as tested options. The two hard cases — a chain bracelet's loop,
 * the gap between trouser legs — need a better model, not more post-processing.
 */
export const U2NETP_REFINE: RefineOptions = {
  sharpen: [0.2, 0.8],
  // 2026-09-17: the black knit's arm gaps came out as white slabs on the stage.
  // Measured: 2 images up (white shirt cuffs +0.046, the knit), 0 down, +60 ms.
  punch: true,
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
type Region = { x: number; y: number; w: number; h: number };

/** Run the model on one region of the bitmap, squashed to n×n. Returns the n×n mask, 0..1. */
async function inferRegion(
  bitmap: ImageBitmap,
  region: Region,
  model: SegmentModel,
  refine: RefineOptions,
): Promise<Float32Array> {
  const n = model.inputSize;
  const small = new OffscreenCanvas(n, n);
  small.getContext("2d")!.drawImage(bitmap, region.x, region.y, region.w, region.h, 0, 0, n, n);
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
  let mask = minMaxNormalise(raw.subarray(0, n * n));
  if (refine.sharpen) mask = sharpenAlpha(mask, refine.sharpen[0], refine.sharpen[1]);
  return mask;
}

/** An n×n mask as a canvas, so it can be drawn (and so resized) like an image. */
function maskToCanvas(mask: Float32Array, n: number): OffscreenCanvas {
  const image = new ImageData(n, n);
  for (let i = 0; i < n * n; i++) {
    image.data[i * 4] = 255;
    image.data[i * 4 + 1] = 255;
    image.data[i * 4 + 2] = 255;
    image.data[i * 4 + 3] = Math.round(mask[i] * 255);
  }
  const c = new OffscreenCanvas(n, n);
  c.getContext("2d")!.putImageData(image, 0, 0);
  return c;
}

/** Bounding box of the mask's confident pixels, in mask coordinates, or null when empty. */
export function maskBounds(mask: Float32Array, n: number, threshold = 0.5): Region | null {
  let x0 = n, y0 = n, x1 = -1, y1 = -1;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (mask[y * n + x] >= threshold) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export async function segmentMask(
  source: Blob,
  model: SegmentModel,
  at?: { width: number; height: number },
  refine: RefineOptions = {},
): Promise<ImageData> {
  const bitmap = await decode(source);
  const width = at?.width ?? bitmap.width;
  const height = at?.height ?? bitmap.height;
  const n = model.inputSize;

  const whole: Region = { x: 0, y: 0, w: bitmap.width, h: bitmap.height };
  const mask = await inferRegion(bitmap, whole, model, refine);

  // Mask → an n×n alpha image, then resized to the output with the canvas's
  // bilinear filter, exactly as the mask must scale.
  const fullCanvas = new OffscreenCanvas(width, height);
  const fctx = fullCanvas.getContext("2d")!;
  fctx.imageSmoothingEnabled = true;
  fctx.imageSmoothingQuality = "high";
  fctx.drawImage(maskToCanvas(mask, n), 0, 0, width, height);

  if (refine.zoom) {
    const box = maskBounds(mask, n);
    if (box && (box.w * box.h) / (n * n) <= refine.zoom.maxAreaFrac) {
      // Pad the box, then make it SQUARE (in source pixels) so the crop is not
      // squashed into the model's square input — a tall bottle squashed to a
      // square is a different object. Clamped to the image; a box that cannot
      // be squared stays rectangular rather than reaching outside the photo.
      const pad = refine.zoom.padFrac;
      let x0 = Math.max(0, box.x - box.w * pad), y0 = Math.max(0, box.y - box.h * pad);
      let x1 = Math.min(n, box.x + box.w * (1 + pad)), y1 = Math.min(n, box.y + box.h * (1 + pad));
      if (refine.zoom.square) {
        const sxp = bitmap.width / n, syp = bitmap.height / n;
        const pw = (x1 - x0) * sxp, ph = (y1 - y0) * syp; // in source pixels
        if (pw < ph) { const grow = (ph - pw) / sxp / 2; x0 = Math.max(0, x0 - grow); x1 = Math.min(n, x1 + grow); }
        else if (ph < pw) { const grow = (pw - ph) / syp / 2; y0 = Math.max(0, y0 - grow); y1 = Math.min(n, y1 + grow); }
      }
      const sx = bitmap.width / n, sy = bitmap.height / n;
      const crop: Region = { x: x0 * sx, y: y0 * sy, w: (x1 - x0) * sx, h: (y1 - y0) * sy };
      const zoomed = await inferRegion(bitmap, crop, model, refine);
      // ⚠️ REPLACE inside the box, do not blend: the first pass's only job was
      // to find the object; the second pass sees it at up to 1/maxAreaFrac
      // the resolution and is the better opinion everywhere it looked.
      const ox = (x0 / n) * width, oy = (y0 / n) * height;
      const ow = ((x1 - x0) / n) * width, oh = ((y1 - y0) / n) * height;
      fctx.clearRect(ox, oy, ow, oh);
      fctx.drawImage(maskToCanvas(zoomed, n), ox, oy, ow, oh);
    }
  }
  const full = fctx.getImageData(0, 0, width, height);

  if (refine.punch) {
    const photo = draw(bitmap, width, height).getContext("2d")!.getImageData(0, 0, width, height).data;
    const alpha = new Float32Array(width * height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = full.data[i * 4 + 3] / 255;
    const q = punchBackground(photo, alpha, width, height, refine.punch === true ? {} : refine.punch);
    for (let i = 0; i < q.length; i++) full.data[i * 4 + 3] = Math.round(q[i] * 255);
  }
  if (refine.guided) {
    // The photo at the mask's resolution is the guide.
    const photo = draw(bitmap, width, height).getContext("2d")!.getImageData(0, 0, width, height).data;
    const alpha = new Float32Array(width * height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = full.data[i * 4 + 3] / 255;
    const r = Math.max(1, Math.round(Math.max(width, height) * refine.guided.radiusFrac));
    const q = guidedFilter(luminance(photo), alpha, width, height, r, refine.guided.eps);
    for (let i = 0; i < q.length; i++) full.data[i * 4 + 3] = Math.round(q[i] * 255);
  }
  bitmap.close();
  return full;
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
export async function segment(
  source: Blob,
  model: SegmentModel,
  target: Blob = source,
  refine: RefineOptions = {},
): Promise<Blob> {
  const bitmap = await decode(target);
  const { width, height } = bitmap;
  const canvas = draw(bitmap, width, height);
  const ctx = canvas.getContext("2d")!;
  const image = ctx.getImageData(0, 0, width, height);
  const mask = await segmentMask(source, model, { width, height }, refine);
  for (let i = 3; i < image.data.length; i += 4) image.data[i] = mask.data[i];
  // ⚠️ Never fill the canvas — a white matte behind every garment looks perfect
  // in a byte count and ruins every screen. Same rule as thumb.ts.
  ctx.putImageData(image, 0, 0);
  bitmap.close();
  return canvas.convertToBlob({ type: "image/png" });
}
