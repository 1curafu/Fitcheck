import type { Slot } from "@/lib/generator/types";
import type { DiaryPiece } from "./month";

/**
 * The corner the day number owns, as percentages. Nothing may be laid into it.
 *
 * Reserving it in the geometry is the only reliable fix: stacking the number
 * above the cutouts makes it legible but still lands it ON a garment, and at
 * 9px over a busy cutout that reads as a smudge.
 */
export const DAY_CORNER = { xPct: 62, yPct: 72 };

/**
 * Thumbnail geometry, authored for the ~45×54px diary cell.
 *
 * This deliberately does NOT reuse `layoutForLook`. Those templates are drawn
 * for a stage of 200px and up, where their generous negative space reads as
 * composition — shrunk to a calendar cell it is simply an empty cell with three
 * small things in one corner, and its SIDE slot runs to 90% height on the right,
 * straight through where the day number has to sit.
 *
 * So the cell gets its own three-slot arrangement: upper body top-left, bottoms
 * up the right, shoes bottom-left, and the bottom-right corner left empty.
 */
const THUMB_SLOTS = {
  UPPER: { xPct: 4, yPct: 4, wPct: 56, hPct: 54, rotationDeg: -4, z: 3 },
  BOTTOMS: { xPct: 54, yPct: 8, wPct: 44, hPct: 56, rotationDeg: 3, z: 2 },
  SHOES: { xPct: 6, yPct: 62, wPct: 46, hPct: 32, rotationDeg: -3, z: 1 },
} satisfies Record<string, Slot>;

const SLOT_ORDER = [THUMB_SLOTS.UPPER, THUMB_SLOTS.BOTTOMS, THUMB_SLOTS.SHOES];

/**
 * How many cutouts a diary cell shows.
 *
 * A diary cell is ~45×54px on a 390px phone (7 columns, 7px gaps, 18px page
 * padding), so a five-piece look gives each garment about 20px and the flat-lay
 * reads as overlapping colour blobs. Three keeps distinct silhouettes while
 * still showing the outfit's palette — which is what a month grid is actually
 * scanned for ("which day was the camel one?"). The full look is one tap away.
 */
export const MAX_THUMB_PIECES = 3;

type Candidate = { category: string; imageUrl: string };

/** One upper-body piece, the bottoms, the shoes — in that reading order. */
const UPPER = ["Outerwear", "Tops"];

/**
 * Choose and position the cutouts for one day's cell.
 *
 * Order is fixed — upper body, bottoms, shoes — so a sparse look fills the
 * template from the top rather than leaving a hole where its missing piece
 * would have gone.
 */
export function thumbnailPieces(pieces: Candidate[]): DiaryPiece[] {
  // A piece the storage layer could not sign is dropped here rather than
  // rendered as <img src="">, which React treats as an error.
  const usable = pieces.filter((p) => Boolean(p.imageUrl));

  const upper = UPPER.map((c) => usable.find((p) => p.category === c)).find(Boolean);
  const bottoms = usable.find((p) => p.category === "Bottoms");
  const shoes = usable.find((p) => p.category === "Shoes");

  const chosen = [upper, bottoms, shoes].filter((p): p is Candidate => Boolean(p));

  // A look made only of accessories has none of the three preferred slots, and
  // an empty cell would read as "nothing logged" for a day that was logged.
  if (chosen.length === 0) {
    chosen.push(...usable.slice(0, MAX_THUMB_PIECES));
  }

  const capped = chosen.slice(0, MAX_THUMB_PIECES);
  return capped.map((p, i) => ({ imageUrl: p.imageUrl, slot: SLOT_ORDER[i] }));
}
