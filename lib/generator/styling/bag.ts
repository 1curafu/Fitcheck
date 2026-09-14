import { isNeutral } from "@/lib/generator/color";
import { familyOf } from "./trios";

/**
 * Whether the bag was chosen WITH the outfit, or just carried.
 *
 * ⚠️ A bag-specific rule, deliberately outside `echo.ts`. The accent-role rule
 * there declines to reward tonal dressing — navy top over navy trousers is a
 * wardrobe, not a decision — and it must not be weakened. A bag is different:
 * it is picked up last, against a finished outfit, so a bag repeating the
 * trousers' or the shoes' colour IS a decision. That is why the bags plan's
 * criterion ("a bag that echoes should be preferred") went unmet through the
 * general echo term and is met here.
 *
 * The research names three intents and scores them:
 *   echo      connect shoes, belt, outerwear (or the lower)      +5..+8
 *   blend     a neutral bag lets a statement elsewhere lead      +7
 *   contrast  a coloured bag is the one focal point              (implied)
 * and one failure: bright bag + bright scarf + bright hat = clutter, -8.
 *
 * ⚠️ Colour FAMILY, not exact name — "coordinate by colour family, undertone,
 * finish" is the sources' modern default, and `trios.ts` already owns the map.
 * Dominant colour only: hardware is `metal.ts`'s business, and a brass clasp
 * must not make a black bag "echo" a camel trouser.
 */
type Piece = { category: string; colors: readonly string[]; subcategory?: string | null };

const ECHO = 1;
const BLEND = 0.85;
const CONTRAST = 0.85;
/** Matches nothing, competes with nothing. Safe, not coordinated. */
const PLAIN = 0.7;
const CLUTTER = 0.4;

function dominant(piece: Piece): string | null {
  return piece.colors[0]?.trim().toLowerCase() ?? null;
}

/**
 * What a bag may coordinate with: the pieces the sources list — shoes, belt,
 * outerwear — plus the lower, which the bags plan's own criterion named.
 */
function counterpartsOf(items: readonly Piece[]): Piece[] {
  return items.filter(
    (i) =>
      i.category === "Shoes" ||
      i.category === "Outerwear" ||
      i.category === "Bottoms" ||
      (i.category === "Accessories" && /belt/i.test(i.subcategory ?? "")),
  );
}

export function bagCoordination(items: readonly Piece[]): number | null {
  const bag = items.find((i) => i.category === "Bags");
  if (!bag) return null;
  const bagColour = dominant(bag);
  if (!bagColour) return null;

  const others = items.filter((i) => i !== bag);
  const bagFamily = familyOf(bagColour);
  const echoes = counterpartsOf(others).some((c) => {
    const f = familyOf(dominant(c) ?? "");
    return f != null && f === bagFamily;
  });
  if (echoes) return ECHO;

  const statementElsewhere = others.some((i) => {
    const c = dominant(i);
    return c != null && !isNeutral(c);
  });
  if (isNeutral(bagColour)) return statementElsewhere ? BLEND : PLAIN;
  return statementElsewhere ? CLUTTER : CONTRAST;
}
