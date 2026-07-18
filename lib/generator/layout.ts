import type { Slot } from "./types";

// Deterministic flat-lay templates (Decision D6). Each category maps to a slot
// (percentages within the stage). Invariants — enforced by layout.test.ts and
// authored to survive real photo cutouts (never the placeholder SVGs):
//   • every slot is in-bounds (0 ≤ x, x+w ≤ 100; same for y/h) → cutouts never clip
//   • |rotation| ≤ 6° → composed, not chaotic
//   • the anchor (outerwear else top) is the largest slot, highest z, and staggers first

type PieceLite = { category: string };

const SLOTS = {
  ANCHOR: { xPct: 6, yPct: 8, wPct: 46, hPct: 64, rotationDeg: -5, z: 3 },
  UPPER: { xPct: 56, yPct: 10, wPct: 36, hPct: 34, rotationDeg: 4, z: 2 },
  SIDE: { xPct: 58, yPct: 46, wPct: 34, hPct: 44, rotationDeg: -3, z: 2 },
  LOWER: { xPct: 18, yPct: 74, wPct: 40, hPct: 20, rotationDeg: 6, z: 2 },
  CORNER: { xPct: 6, yPct: 76, wPct: 14, hPct: 16, rotationDeg: -6, z: 1 },
} satisfies Record<string, Slot>;

type Role = keyof typeof SLOTS;

function roleFor(category: string, hasOuter: boolean): Role {
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
      return "CORNER"; // Accessories (and any extra)
  }
}

export function layoutForLook(pieces: PieceLite[]): Slot[] {
  const hasOuter = pieces.some((p) => p.category === "Outerwear");
  return pieces.map((p) => ({ ...SLOTS[roleFor(p.category, hasOuter)] }));
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
