import type { Slot } from "./types";

// Deterministic flat-lay templates (Decision D6). Each category maps to a slot
// (percentages within the stage). Invariants — enforced by layout.test.ts and
// authored to survive real photo cutouts (never the placeholder SVGs):
//   • every slot is in-bounds (0 ≤ x, x+w ≤ 100; same for y/h) → cutouts never clip
//   • |rotation| ≤ 6° → composed, not chaotic
//   • the anchor (outerwear else top) is the largest slot, highest z, and staggers first
//   • garments run down the middle; accessories and bags take alternating side rails

type PieceLite = { category: string };

/**
 * The side rails: small carried and worn pieces, alternating left and right.
 *
 * ⚠️ Every accessory used to land on ONE slot, so a watch, a bracelet and a bag
 * were placed at identical coordinates and stacked — seen in a real drop with
 * the bracelet on top of the camera bag.
 *
 * Kept narrow so the garments keep the width, and square-ish so a watch or a bag
 * is not squashed into a letterbox.
 */
const RAILS: Slot[] = [
  { xPct: 1, yPct: 24, wPct: 18, hPct: 30, rotationDeg: -6, z: 1 },
  { xPct: 81, yPct: 24, wPct: 18, hPct: 30, rotationDeg: 6, z: 1 },
  { xPct: 1, yPct: 60, wPct: 18, hPct: 30, rotationDeg: 4, z: 1 },
  { xPct: 81, yPct: 60, wPct: 18, hPct: 30, rotationDeg: -5, z: 1 },
];

/**
 * The garments, arranged for the stage's shape.
 *
 * ⚠️ The stage is LANDSCAPE — `flex-1` with a 200px floor, so on a phone it
 * lands near 385x230 — and slots are `object-contain`, so HEIGHT caps how big a
 * garment renders. A vertical column fights that shape: measured, a 44%-tall
 * anchor made every piece small, and a 62%-tall one hid the trousers behind the
 * shirt so only the lower legs showed. The garments use the width instead.
 *
 * ⚠️ Chosen by COUNT, not by role. Role names could not express a dress look: a
 * one-piece and a coat both wanted the anchor and would have overlapped exactly,
 * the same collision the top and coat had. A look carries two, three or four
 * garments whatever they are, and the first slot is always the anchor.
 */
const GARMENT_TEMPLATES: Record<2 | 3 | 4, Slot[]> = {
  // A one-piece and shoes. Nothing else needs the width, so the dress takes it.
  2: [
    { xPct: 26, yPct: 1, wPct: 48, hPct: 68, rotationDeg: -3, z: 3 },
    { xPct: 34, yPct: 68, wPct: 32, hPct: 30, rotationDeg: 5, z: 2 },
  ],
  // Top, bottom, shoes — or coat, dress, shoes.
  3: [
    { xPct: 20, yPct: 2, wPct: 30, hPct: 64, rotationDeg: -4, z: 3 },
    { xPct: 51, yPct: 2, wPct: 29, hPct: 64, rotationDeg: 3, z: 2 },
    { xPct: 36, yPct: 66, wPct: 28, hPct: 32, rotationDeg: 5, z: 2 },
  ],
  // Coat, top, bottom, shoes — a 2x2 block, which a landscape stage fits.
  4: [
    { xPct: 20, yPct: 1, wPct: 29, hPct: 53, rotationDeg: -4, z: 3 },
    { xPct: 51, yPct: 2, wPct: 28, hPct: 48, rotationDeg: 3, z: 2 },
    { xPct: 20, yPct: 55, wPct: 29, hPct: 43, rotationDeg: -3, z: 2 },
    { xPct: 53, yPct: 58, wPct: 24, hPct: 38, rotationDeg: 5, z: 2 },
  ],
};

/**
 * Reading order: outer layer, then the body, then the lower half, then shoes.
 *
 * A one-piece ranks with tops because it is the body garment; under a coat it
 * sits where a top would.
 */
const READING_ORDER: Record<string, number> = {
  Outerwear: 0,
  "One-piece": 1,
  Tops: 1,
  Bottoms: 2,
  Shoes: 3,
};

function isGarment(category: string): boolean {
  return category in READING_ORDER;
}

export function layoutForLook(pieces: PieceLite[]): Slot[] {
  const garments = pieces
    .map((p, i) => ({ i, rank: READING_ORDER[p.category] }))
    .filter((g): g is { i: number; rank: number } => g.rank !== undefined)
    .sort((a, b) => a.rank - b.rank || a.i - b.i);

  // More garments than any template holds is not a crash: the extras reuse the
  // last slot rather than dropping out of the look.
  const size = Math.min(4, Math.max(2, garments.length)) as 2 | 3 | 4;
  const template = GARMENT_TEMPLATES[size];
  const slotFor = new Map<number, Slot>();
  garments.forEach((g, n) => slotFor.set(g.i, template[Math.min(n, template.length - 1)]));

  let rail = 0;
  return pieces.map((p, i) => {
    const slot = slotFor.get(i);
    if (slot) return { ...slot };
    // Rails are handed out in order and wrap, so a look with more small pieces
    // than rails degrades to overlap rather than to a crash.
    const r = RAILS[rail % RAILS.length];
    rail += 1;
    return { ...r };
  });
}

/** Indices in re-lay stagger order: the anchor (highest z, ties → largest area) first, then input order. */
export function staggerOrder(slots: Slot[]): number[] {
  let anchor = 0;
  for (let i = 1; i < slots.length; i++) {
    const a = slots[anchor];
    const b = slots[i];
    if (b.z > a.z || (b.z === a.z && b.wPct * b.hPct > a.wPct * a.hPct)) anchor = i;
  }
  const rest = slots.map((_, i) => i).filter((i) => i !== anchor);
  return [anchor, ...rest];
}
