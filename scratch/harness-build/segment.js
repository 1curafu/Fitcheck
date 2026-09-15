// ⚠️ The `/wasm` entry, not the default. The default bundle includes WebGPU and
// fetches the 28 MB JSEP runtime; this one loads the 14 MB WASM-only runtime,
// which is all a 320px u2netp needs.
import * as ort from "onnxruntime-web/wasm";
import { minMaxNormalise } from "./mask-metrics";
/**
 * U²-Net "p" — the 4.7 MB variant. Apache-2.0 weights (xuebinqin/U-2-Net),
 * trained on DUTS-TR, which carries no non-commercial clause. Constants are the
 * ones rembg's u2net session uses. Served from our own origin, never a CDN.
 */
export const U2NETP = {
    url: "/models/u2netp.onnx",
    inputSize: 320,
    mean: [0.485, 0.456, 0.406],
    std: [0.229, 0.224, 0.225],
};
/** RGBA pixels → NCHW float tensor data, RGB, per-channel normalised. Alpha is ignored. */
export function toModelInput(rgba, width, height, { mean, std }) {
    const plane = width * height;
    const out = new Float32Array(3 * plane);
    for (let i = 0; i < plane; i++) {
        out[i] = (rgba[i * 4] / 255 - mean[0]) / std[0];
        out[plane + i] = (rgba[i * 4 + 1] / 255 - mean[1]) / std[1];
        out[2 * plane + i] = (rgba[i * 4 + 2] / 255 - mean[2]) / std[2];
    }
    return out;
}
// ⚠️ One session per model, for the life of the page. Onboarding captures five
// items in a row; creating the session each time would pay the WASM setup five
// times over.
const sessions = new Map();
function sessionFor(model) {
    let s = sessions.get(model.url);
    if (!s) {
        s = ort.InferenceSession.create(model.url, { executionProviders: ["wasm"] });
        sessions.set(model.url, s);
    }
    return s;
}
/** Where the runtime's .wasm lives. Ours, so no third party is fetched at runtime. */
export function configureRuntime(wasmPaths = "/ort/") {
    ort.env.wasm.wasmPaths = wasmPaths;
}
async function decode(source) {
    return createImageBitmap(source);
}
function draw(bitmap, w, h) {
    const c = new OffscreenCanvas(w, h);
    const ctx = c.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, w, h);
    return c;
}
/**
 * The alpha mask for `source`, at the SOURCE's resolution, as an ImageData
 * whose alpha channel is the mask. Exposed separately because it is the seam
 * every future quality fix needs — hole filling, feathering, thresholding —
 * none of which were possible when the library handed back a composited PNG.
 */
export async function segmentMask(source, model) {
    const bitmap = await decode(source);
    const { width, height } = bitmap;
    const n = model.inputSize;
    const small = draw(bitmap, n, n);
    const pixels = small.getContext("2d").getImageData(0, 0, n, n).data;
    const input = new ort.Tensor("float32", toModelInput(pixels, n, n, model), [1, 3, n, n]);
    const session = await sessionFor(model);
    const outputs = await session.run({ [session.inputNames[0]]: input });
    // ⚠️ The FIRST output. U²-Net emits seven side outputs; d0 is the fused one.
    const raw = outputs[session.outputNames[0]].data;
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
    maskCanvas.getContext("2d").putImageData(maskImage, 0, 0);
    const full = new OffscreenCanvas(width, height);
    const fctx = full.getContext("2d");
    fctx.imageSmoothingEnabled = true;
    fctx.imageSmoothingQuality = "high";
    fctx.drawImage(maskCanvas, 0, 0, width, height);
    bitmap.close();
    return fctx.getImageData(0, 0, width, height);
}
/** The cutout: the source's own pixels with the mask written into alpha. PNG, uncompressed. */
export async function segment(source, model) {
    const bitmap = await decode(source);
    const { width, height } = bitmap;
    const canvas = draw(bitmap, width, height);
    const ctx = canvas.getContext("2d");
    const image = ctx.getImageData(0, 0, width, height);
    const mask = await segmentMask(source, model);
    for (let i = 3; i < image.data.length; i += 4)
        image.data[i] = mask.data[i];
    // ⚠️ Never fill the canvas — a white matte behind every garment looks perfect
    // in a byte count and ruins every screen. Same rule as thumb.ts.
    ctx.putImageData(image, 0, 0);
    bitmap.close();
    return canvas.convertToBlob({ type: "image/png" });
}
