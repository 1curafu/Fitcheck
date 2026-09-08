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
  ANCHOR: { xPct: 24, yPct: 4, wPct: 52, hPct: 44, rotationDeg: -4, z: 3 },
  UPPER: { xPct: 30, yPct: 2, wPct: 40, hPct: 30, rotationDeg: 3, z: 2 },
  SIDE: { xPct: 27, yPct: 44, wPct: 46, hPct: 36, rotationDeg: -3, z: 2 },
  LOWER: { xPct: 30, yPct: 78, wPct: 40, hPct: 18, rotationDeg: 5, z: 2 },
  // The rails. Alternating left/right keeps two accessories apart instead of
  // letting them collide, and keeps each clear of the middle column.
  RAIL_L1: { xPct: 2, yPct: 20, wPct: 19, hPct: 20, rotationDeg: -6, z: 1 },
  RAIL_R1: { xPct: 79, yPct: 20, wPct: 19, hPct: 20, rotationDeg: 6, z: 1 },
  RAIL_L2: { xPct: 2, yPct: 56, wPct: 19, hPct: 20, rotationDeg: 4, z: 1 },
  RAIL_R2: { xPct: 79, yPct: 56, wPct: 19, hPct: 20, rotationDeg: -5, z: 1 },
} satisfies Record<string, Slot>;

const RAILS = ["RAIL_L1", "RAIL_R1", "RAIL_L2", "RAIL_R2"] as const;

type Role = keyof typeof SLOTS;

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
    if (role) return { ...SLOTS[role] };
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
