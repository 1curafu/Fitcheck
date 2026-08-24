export function compressionOptions() {
  // Force JPEG: the original is only ever shown as a photo (no transparency
  // needed), and it keeps the stored bytes in sync with the "image/jpeg"
  // content-type we upload it under.
  return {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: "image/jpeg",
  };
}

/**
 * Longest-side cap for the stored thumbnail.
 *
 * Measured against the real layouts on a 390px viewport rather than picked: the
 * closet grid is `columns-2` inside `px-6` with `gap-3` and a `p-5` card, so the
 * tallest masonry cell (200px, minus that padding) renders an image box of
 * ~125 × 160 CSS px. At DPR 3 — every current iPhone — that is 375 × 480 device
 * pixels, and 480 is the longest side of it.
 *
 * Every other consumer is far under: the item-detail "Goes with" tile is 68 CSS
 * px (204 at 3×) and a diary cell ~45 × 54 (162 at 3×). One derivative serves
 * all three. A second, smaller one would double the upload work and the storage
 * to save a few kB on the two surfaces that are already cheap.
 */
export const THUMB_MAX_PX = 480;
