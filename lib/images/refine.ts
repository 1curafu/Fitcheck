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

/**
 * `punchBackground` — where the model is confidently wrong AND the photo can
 * prove it. u2netp fills concave gaps (between an arm and a torso, inside a
 * bag's handle) at full alpha; on the dark stage they show as white slabs. When
 * the background is one flat colour, any kept pixel of that colour that is
 * reachable from the outside through more of that colour cannot be garment.
 *
 * Flood from the transparent exterior into kept pixels within `tol` of the
 * background colour, then keep only the flooded regions that reach at least
 * `minDepthFrac` of the image into the mask. Three refusals keep it safe: a
 * background that is not flat (nothing to match against); a garment that shares
 * the background's colour (a white shirt on white — every pixel would qualify);
 * a region that only hugs the outline (that is the edge of a pale garment, not
 * a gap — measured: it nibbled a white sneaker); and a region with no width
 * anywhere (that is a seam's shadow, not a gap — measured: it cracked a pair of
 * cream trousers along the inseam). Enclosed regions are never reached, so a
 * print the colour of the background survives.
 */
export function punchBackground(
  rgba: Uint8ClampedArray,
  alpha: Float32Array,
  w: number,
  h: number,
  opts: {
    tol?: number;
    maxSpread?: number;
    maxGarmentShare?: number;
    minDepthFrac?: number;
    minWidthFrac?: number;
  } = {},
): Float32Array {
  const { tol = 10, maxSpread = 18, maxGarmentShare = 0.08, minDepthFrac = 0.015, minWidthFrac = 0.004 } = opts;
  const n = w * h;
  const EXT = 0.05, KEPT = 0.5;

  let sr = 0, sg = 0, sb = 0, count = 0;
  for (let i = 0; i < n; i++) if (alpha[i] < EXT) { sr += rgba[i * 4]; sg += rgba[i * 4 + 1]; sb += rgba[i * 4 + 2]; count++; }
  if (count < n * 0.05) return alpha;
  const br = sr / count, bg = sg / count, bb = sb / count;
  const dist = (i: number) => Math.hypot(rgba[i * 4] - br, rgba[i * 4 + 1] - bg, rgba[i * 4 + 2] - bb);
  let spread = 0;
  for (let i = 0; i < n; i++) if (alpha[i] < EXT) spread += dist(i);
  if (spread / count > maxSpread) return alpha;

  let kept = 0, keptLikeBg = 0;
  for (let i = 0; i < n; i++) if (alpha[i] >= KEPT) { kept++; if (dist(i) <= tol) keptLikeBg++; }
  if (kept === 0 || keptLikeBg / kept > maxGarmentShare) return alpha;

  const neighbours = (i: number, f: (j: number) => void) => {
    const x = i % w, y = (i - x) / w;
    if (x > 0) f(i - 1); if (x < w - 1) f(i + 1); if (y > 0) f(i - w); if (y < h - 1) f(i + w);
  };

  // Depth: BFS steps from the exterior through anything — how far inside a pixel sits.
  const depth = new Int32Array(n).fill(-1);
  const queue = new Int32Array(n);
  let head = 0, tail = 0;
  for (let i = 0; i < n; i++) if (alpha[i] < EXT) { depth[i] = 0; queue[tail++] = i; }
  while (head < tail) {
    const i = queue[head++];
    neighbours(i, (j) => { if (depth[j] < 0) { depth[j] = depth[i] + 1; queue[tail++] = j; } });
  }

  // Flood from the exterior through background-coloured kept pixels only.
  const reached = new Uint8Array(n);
  head = 0; tail = 0;
  for (let i = 0; i < n; i++) if (alpha[i] < EXT) { reached[i] = 1; queue[tail++] = i; }
  while (head < tail) {
    const i = queue[head++];
    neighbours(i, (j) => { if (!reached[j] && dist(j) <= tol) { reached[j] = 1; queue[tail++] = j; } });
  }

  // Each flooded region is punched only if it reaches deep enough to be a gap
  // and is wide enough somewhere to be one: a pixel whose whole (2r+1)² block
  // is flooded exists only where the region is at least 2r+1 across.
  const minDepth = Math.max(2, Math.round(Math.max(w, h) * minDepthFrac));
  const r = Math.max(1, Math.round(Math.max(w, h) * minWidthFrac));
  const flooded = (i: number) => reached[i] && alpha[i] >= EXT;
  const wide = (i: number) => {
    const x = i % w, y = (i - x) / w;
    if (x < r || y < r || x >= w - r || y >= h - r) return false;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!flooded(i + dy * w + dx)) return false;
    return true;
  };
  const out = alpha.slice();
  const labelled = new Uint8Array(n);
  const region = new Int32Array(n);
  for (let s = 0; s < n; s++) {
    if (!flooded(s) || labelled[s]) continue;
    let rh = 0, rt = 0, deepest = 0, hasWidth = false;
    region[rt++] = s; labelled[s] = 1;
    while (rh < rt) {
      const i = region[rh++];
      if (depth[i] > deepest) deepest = depth[i];
      if (!hasWidth && wide(i)) hasWidth = true;
      neighbours(i, (j) => { if (flooded(j) && !labelled[j]) { labelled[j] = 1; region[rt++] = j; } });
    }
    if (deepest >= minDepth && hasWidth) for (let k = 0; k < rt; k++) out[region[k]] = 0;
  }
  return out;
}
