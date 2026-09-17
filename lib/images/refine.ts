/**
 * Mask refinement — pure functions over Float32 planes, no canvas.
 *
 * Two tools, for two different failures measured on real photos:
 *
 * `sharpenAlpha` — where the model is UNSURE. Inside a chain bracelet's loop
 * 73% of the wrongly-kept pixels had alpha under 128 while real garment pixels
 * were 86% above 224. A contrast curve separates them for free.
 *
 * `guidedFilter` — where the model is CONFIDENTLY wrong. Between a pair of
 * trouser legs 89% of the wrongly-kept pixels were at full alpha; no curve can
 * fix that, only the photo can. The guided filter (He, Sun & Tang, 2010) fits
 * the mask to a local linear function of the image, so mask edges snap to real
 * edges and a background-coloured region inside the mask is pulled back out —
 * within its radius. It is O(N) via box filters, and it is NOT a hole-filler
 * for holes larger than the radius; that is the zoom pass's job.
 */

/** Smoothstep contrast: ≤lo → 0, ≥hi → 1, smooth ramp between. */
export function sharpenAlpha(alpha: Float32Array, lo: number, hi: number): Float32Array {
  const out = new Float32Array(alpha.length);
  const span = hi - lo;
  for (let i = 0; i < alpha.length; i++) {
    const t = Math.min(1, Math.max(0, (alpha[i] - lo) / span));
    out[i] = t * t * (3 - 2 * t);
  }
  return out;
}

/**
 * Mean over a (2r+1)² window, edges clamped to the image. Integral image, so the
 * cost does not depend on the radius.
 */
export function boxMean(src: Float32Array, w: number, h: number, r: number): Float32Array {
  // Integral image with a zero row and column so every window is one expression.
  const W = w + 1;
  const integral = new Float64Array(W * (h + 1));
  for (let y = 1; y <= h; y++) {
    let rowSum = 0;
    for (let x = 1; x <= w; x++) {
      rowSum += src[(y - 1) * w + (x - 1)];
      integral[y * W + x] = integral[(y - 1) * W + x] + rowSum;
    }
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h - 1, y + r);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w - 1, x + r);
      const sum =
        integral[(y1 + 1) * W + (x1 + 1)] - integral[y0 * W + (x1 + 1)] - integral[(y1 + 1) * W + x0] + integral[y0 * W + x0];
      out[y * w + x] = sum / ((y1 - y0 + 1) * (x1 - x0 + 1));
    }
  }
  return out;
}

/**
 * q = mean(a)·I + mean(b), where (a, b) is the least-squares fit of p to I over
 * each window. `eps` is the regulariser: larger keeps more of the input mask,
 * smaller trusts the guide's edges more.
 */
export function guidedFilter(
  guide: Float32Array,
  p: Float32Array,
  w: number,
  h: number,
  r: number,
  eps: number,
): Float32Array {
  const n = w * h;
  const meanI = boxMean(guide, w, h, r);
  const meanP = boxMean(p, w, h, r);
  const II = new Float32Array(n), IP = new Float32Array(n);
  for (let i = 0; i < n; i++) { II[i] = guide[i] * guide[i]; IP[i] = guide[i] * p[i]; }
  const corrI = boxMean(II, w, h, r);
  const corrIP = boxMean(IP, w, h, r);
  const a = new Float32Array(n), b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const varI = corrI[i] - meanI[i] * meanI[i];
    const covIP = corrIP[i] - meanI[i] * meanP[i];
    a[i] = covIP / (varI + eps);
    b[i] = meanP[i] - a[i] * meanI[i];
  }
  const meanA = boxMean(a, w, h, r);
  const meanB = boxMean(b, w, h, r);
  const q = new Float32Array(n);
  for (let i = 0; i < n; i++) q[i] = Math.min(1, Math.max(0, meanA[i] * guide[i] + meanB[i]));
  return q;
}

/** Luminance of RGBA pixels as a 0..1 plane — the guide. */
export function luminance(rgba: Uint8ClampedArray): Float32Array {
  const out = new Float32Array(rgba.length / 4);
  for (let i = 0; i < out.length; i++) {
    out[i] = (0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2]) / 255;
  }
  return out;
}
