import type { Slot } from "./types";

// Deterministic flat-lay templates (Decision D6). Each category maps to a slot
// (percentages within the stage). Invariants — enforced by layout.test.ts and
// authored to survive real photo cutouts (never the placeholder SVGs):
//   • every slot is in-bounds (0 ≤ x, x+w ≤ 100; same for y/h) → cutouts never clip
//   • |rotation| ≤ 6° → composed, not chaotic
//   • the anchor (outerwear else top) is the largest slot, highest z, and staggers first
//   • garments run down the middle; accessories and bags take alternating side rails

type PieceLite = { category: string };

const SLOTS = {
  // The garments run down the MIDDLE; small carried and worn pieces sit in rails
  // down either side.
  //
  // ⚠️ Every accessory used to land on one CORNER slot, so a watch, a bracelet
  // and a bag were placed at identical coordinates and stacked on top of each
  // other — visible in the real drop, where the bracelet sat on the bag. Looks
  // now routinely carry five pieces rather than three, which this template
  // predates.
  //
  // ⚠️ UPPER was only ever used when the look had outerwear, so a look without a
  // coat left the whole top-right quadrant empty. The middle column is sized to
  // fill the stage on its own.
  // The rails, kept narrow so the middle keeps the width, and square-ish so a
  // watch or a bag is not squashed into a letterbox.
  RAIL_L1: { xPct: 1, yPct: 24, wPct: 18, hPct: 30, rotationDeg: -6, z: 1 },
  RAIL_R1: { xPct: 81, yPct: 24, wPct: 18, hPct: 30, rotationDeg: 6, z: 1 },
  RAIL_L2: { xPct: 1, yPct: 60, wPct: 18, hPct: 30, rotationDeg: 4, z: 1 },
  RAIL_R2: { xPct: 81, yPct: 60, wPct: 18, hPct: 30, rotationDeg: -5, z: 1 },
} satisfies Record<string, Slot>;

/**
 * The garments, arranged for the stage's shape.
 *
 * ⚠️ The stage is LANDSCAPE — `flex-1` with a 200px floor, so on a phone it
 * lands near 385x230 — and slots are `object-contain`, so HEIGHT caps how big a
 * garment renders. A vertical column fights that shape: measured, a 44%-tall
 * anchor made every piece small, and a 62%-tall one hid the trousers behind the
 * shirt so only the lower legs showed. The garments use the width instead.
 *
 * ⚠️ Two templates, because four garments cannot sit where three do. With a
 * coat, `UPPER` and `ANCHOR` previously overlapped almost exactly and the top
 * was buried under it.
 */
const TRIO = {
  ANCHOR: { xPct: 20, yPct: 2, wPct: 30, hPct: 64, rotationDeg: -4, z: 3 },
  UPPER: { xPct: 20, yPct: 2, wPct: 30, hPct: 64, rotationDeg: -4, z: 3 },
  SIDE: { xPct: 51, yPct: 2, wPct: 29, hPct: 64, rotationDeg: 3, z: 2 },
  LOWER: { xPct: 36, yPct: 66, wPct: 28, hPct: 32, rotationDeg: 5, z: 2 },
} satisfies Record<string, Slot>;

/** Coat, top, trousers, shoes — a 2x2 block, which a landscape stage fits. */
const QUAD = {
  ANCHOR: { xPct: 20, yPct: 1, wPct: 29, hPct: 53, rotationDeg: -4, z: 3 },
  UPPER: { xPct: 51, yPct: 2, wPct: 28, hPct: 48, rotationDeg: 3, z: 2 },
  SIDE: { xPct: 20, yPct: 55, wPct: 29, hPct: 43, rotationDeg: -3, z: 2 },
  LOWER: { xPct: 53, yPct: 58, wPct: 24, hPct: 38, rotationDeg: 5, z: 2 },
} satisfies Record<string, Slot>;

const RAILS = ["RAIL_L1", "RAIL_R1", "RAIL_L2", "RAIL_R2"] as const;

type Role = keyof typeof TRIO;

function roleFor(category: string, hasOuter: boolean): Role | null {
  switch (category) {
    case "Outerwear":
      return "ANCHOR";
    case "Tops":
      return hasOuter ? "UPPER" : "ANCHOR";
    case "Bottoms":
      return "SIDE";
    case "Shoes":
      return "LOWER";
    default:
      return null; // Accessories, Bags and anything else take a rail
  }
}

export function layoutForLook(pieces: PieceLite[]): Slot[] {
  const hasOuter = pieces.some((p) => p.category === "Outerwear");
  let rail = 0;
  return pieces.map((p) => {
    const role = roleFor(p.category, hasOuter);
    if (role) return { ...(hasOuter ? QUAD : TRIO)[role] };
    // Rails are handed out in order and wrap, so a look with more small pieces
    // than rails degrades to overlap rather than to a crash.
    const slot = SLOTS[RAILS[rail % RAILS.length]];
    rail += 1;
    return { ...slot };
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
