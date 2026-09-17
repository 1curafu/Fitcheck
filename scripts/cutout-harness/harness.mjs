import { segment, configureRuntime, U2NETP, U2NETP_REFINE } from "/scratch/harness-build/segment.js";
import { alphaCoverage, maskIoU } from "/scratch/harness-build/mask-metrics.js";

configureRuntime("/public/ort/");

const toBlob = (b64, type) => fetch(`data:${type};base64,${b64}`).then((r) => r.blob());
const toB64 = async (blob) => {
  const buf = await blob.arrayBuffer();
  let s = ""; const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const pixels = async (blob) => {
  const bmp = await createImageBitmap(blob);
  const c = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = c.getContext("2d"); ctx.drawImage(bmp, 0, 0);
  return { data: ctx.getImageData(0, 0, bmp.width, bmp.height).data, w: bmp.width, h: bmp.height };
};

window.harness = {
  // ⚠️ The SHIPPED config, not one the harness writes for itself. A sweep found
  // the harness blind to a wrong `mean` because it carried its own copy.
  async ours(b64, type, override = {}, compressFirst = false, refine = null) {
    refine ??= U2NETP_REFINE;
    const model = { ...U2NETP, url: "/public" + U2NETP.url, ...override };
    let input = await toBlob(b64, type);
    // Approximates lib/images/options.ts (1280px, JPEG) — what the OLD library
    // was handed. Lets the "model sees the original" choice be measured.
    if (compressFirst) {
      const bmp = await createImageBitmap(input);
      const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
      const c = new OffscreenCanvas(Math.round(bmp.width * k), Math.round(bmp.height * k));
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      input = await c.convertToBlob({ type: "image/jpeg", quality: 0.8 });
    }
    const t0 = performance.now();
    const out = await segment(input, model, await toBlob(b64, type), refine);
    return { png: await toB64(out), ms: Math.round(performance.now() - t0) };
  },
  async compare(pngA, pngB) {
    const a = await pixels(await toBlob(pngA, "image/png"));
    const b = await pixels(await toBlob(pngB, "image/png"));
    if (a.w !== b.w || a.h !== b.h) return { error: `size ${a.w}x${a.h} vs ${b.w}x${b.h}` };
    return { iou: maskIoU(a.data, b.data), coverageA: alphaCoverage(a.data), coverageB: alphaCoverage(b.data) };
  },
};
window.harnessReady = true;
