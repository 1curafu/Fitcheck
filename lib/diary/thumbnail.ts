import { layoutForLook } from "@/lib/generator/layout";
import type { DiaryPiece } from "./month";

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
 * Geometry comes from `layoutForLook`, the same deterministic templates the
 * full-size flat-lay uses, so a thumbnail is a scaled-down version of the look
 * the user tapped rather than a second, divergent layout system. The templates
 * are percentage-based, so they survive the shrink unchanged.
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
  const slots = layoutForLook(capped);
  return capped.map((p, i) => ({ imageUrl: p.imageUrl, slot: slots[i] }));
}
