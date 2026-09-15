/**
 * Pure pixel arithmetic for judging a cutout. No canvas, no DOM — so it runs in
 * a unit test, in the browser harness, and in a Node script identically.
 *
 * ⚠️ These exist so "no quality regression" is a number per image rather than
 * a feeling. The bar the pipeline plan sets is IoU ≥ 0.98 on EVERY fixture,
 * never on the mean: one catastrophic cutout hides inside a good average.
 */
/** Share of the image that is not transparent, weighting a soft pixel by its alpha. */
export function alphaCoverage(rgba) {
    const pixels = rgba.length / 4;
    if (pixels === 0)
        return 0;
    let sum = 0;
    for (let i = 3; i < rgba.length; i += 4)
        sum += rgba[i];
    return sum / 255 / pixels;
}
/**
 * Soft intersection-over-union of two alpha channels: min over max, per pixel.
 * Soft, not thresholded, because the edges are where cutouts differ.
 */
export function maskIoU(a, b) {
    if (a.length !== b.length)
        throw new Error(`mask sizes differ: ${a.length} vs ${b.length}`);
    let inter = 0;
    let union = 0;
    for (let i = 3; i < a.length; i += 4) {
        inter += Math.min(a[i], b[i]);
        union += Math.max(a[i], b[i]);
    }
    return union === 0 ? 1 : inter / union;
}
/** Map a model's raw output onto 0..1 by its own range. Flat input → all zero. */
export function minMaxNormalise(values) {
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of values) {
        if (v < lo)
            lo = v;
        if (v > hi)
            hi = v;
    }
    const range = hi - lo;
    const out = new Float32Array(values.length);
    if (range === 0)
        return out;
    for (let i = 0; i < values.length; i++)
        out[i] = (values[i] - lo) / range;
    return out;
}
