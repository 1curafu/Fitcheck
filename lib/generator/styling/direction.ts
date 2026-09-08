import { colorHex } from "@/lib/closet/vocab";
import { relativeLuminance, contrastRatio } from "./value";

/**
 * Which way round the light and dark sit — an asymmetry the pairing table
 * cannot express.
 *
 * ⚠️ `pairingRating` sorts its two colours before looking them up, so
 * `navy + white` and `white + navy` are the same entry by construction. The
 * research says that is wrong: a white shirt over navy trousers is tailoring
 * canon, while a navy top over white trousers is "spring/summer, preppy or
 * resort-leaning, not an all-year business default". Same two colours, opposite
 * verdict.
 *
 * ⚠️ Judged on the OUTFIT's own formality, not the occasion band. The bands
 * overlap heavily — every one includes smart casual — so they cannot say
 * whether a look is dressy. Its garments can.
 */

/** Below this the two are too close for either to read as "the light one". */
const MEANINGFUL = 1.5;

/** At or above this the look is dressy enough for the seasonal reading to cost. */
const DRESSY = 4;

function valueOf(colours: readonly string[]): number | null {
  for (const c of colours) {
    const hex = colorHex(c.trim().toLowerCase());
    const lum = hex ? relativeLuminance(hex) : null;
    if (lum != null) return lum;
  }
  return null;
}

type Garment = { category: string; colors: readonly string[]; formality?: number | null };

/**
 * `null` when there is no upper-over-lower relationship to read: a one-piece
 * look, a missing half, colours outside the palette, or two values close enough
 * that neither leads.
 *
 * 1 for the canonical direction (light over dark). Below it for the inverted
 * one, and how far below depends on the register — the research frames a light
 * lower as *seasonal*, never as wrong.
 */
export function valueDirection(items: readonly Garment[]): number | null {
  const upper = items.find((i) => i.category === "Tops");
  const lower = items.find((i) => i.category === "Bottoms");
  if (!upper || !lower) return null;

  const up = valueOf(upper.colors);
  const low = valueOf(lower.colors);
  if (up == null || low == null) return null;
  if (contrastRatio(up, low) < MEANINGFUL) return null;

  if (up > low) return 1; // light top, dark bottom — the tailoring default

  // Dark top over a light lower. Fine in a relaxed register, out of place in a
  // dressy one, which is exactly how the sources describe white trousers.
  const dressy = Math.max(upper.formality ?? 3, lower.formality ?? 3) >= DRESSY;
  return dressy ? 0.35 : 0.8;
}
