import type { ColorName } from "@/lib/closet/vocab";

/**
 * Warm / cool / temperature-neutral, for all 42 colours.
 *
 * This is the axis the generator did not have, and its absence is the whole
 * reported defect: `cream` and `white` are both `neutral: true` in
 * `vocab.COLORS`, so a warm cream shoe and a cool white one scored IDENTICALLY
 * against a cool light-blue shirt. Temperature is what separates them.
 *
 * ⚠️ ORTHOGONAL to `vocab.COLORS[].neutral`, not a replacement for it. That flag
 * answers "can this colour anchor an outfit?"; this answers "which way does it
 * lean?". A colour can be a neutral AND warm (camel), or a neutral AND cool
 * (navy). Deriving one from the other would be wrong.
 *
 * Source: `docs/research/fit-check-research-round2-raw.md` §D1, which classifies
 * all 42 with a cited basis per row.
 */
export type Temperature = "warm" | "cool" | "neutral";

export const COLOUR_TEMPERATURE: Record<ColorName, Temperature> = {
  // Achromatic — the cool-neutral spine
  black: "cool", charcoal: "cool", grey: "cool", silver: "cool", white: "cool",
  // ⚠️ ivory and cream are WHITE WITH YELLOW UNDERTONES, not white. This one
  // row is the difference between the right shoe and the wrong one.
  ivory: "warm", cream: "warm",
  // Warm neutrals / earths
  // ⚠️ `stone` is the documented exception: a pale GREY-beige, the coolest of an
  // otherwise-warm family. Both research rounds independently flagged it.
  stone: "cool",
  sand: "warm", beige: "warm",
  // `taupe` is a grey-brown sitting between warm beige and cool grey — the
  // research's explicit advice is to treat it as temperature-neutral in practice
  // rather than force it to a side.
  taupe: "neutral",
  khaki: "warm", camel: "warm", tan: "warm", caramel: "warm",
  chocolate: "warm", brown: "warm",
  // Blues
  navy: "cool", indigo: "cool", denim: "cool", blue: "cool", sky: "cool", teal: "cool",
  // Greens — split by undertone, not by being green
  olive: "warm",   // yellow-based
  sage: "cool",    // grey-green
  forest: "cool",  // blue-based
  // ⚠️ unqualified `green` genuinely spans both undertones and no clothing
  // source resolves it. Neutral is the honest answer, not a coin flip.
  green: "neutral",
  mint: "cool",
  // Reds / pinks
  burgundy: "cool",  // purple undertone
  maroon: "warm",    // brown undertone
  red: "warm", rust: "warm", terracotta: "warm", coral: "warm",
  // Saturated pink is warm, dusty pink reads near-cool; shade-dependent, so neutral.
  pink: "neutral",
  // Purples
  purple: "cool", lavender: "cool", plum: "cool",
  // Yellows / oranges
  // Muted mustard behaves like a warm neutral, bright mustard is a statement —
  // the temperature is warm either way; only the neutral/accent axis shifts.
  mustard: "warm", yellow: "warm", gold: "warm", orange: "warm",
};

export function temperatureOf(colour: string): Temperature {
  return COLOUR_TEMPERATURE[colour.trim().toLowerCase() as ColorName] ?? "neutral";
}

/**
 * Colours whose availability is genuinely seasonal in the LOWER role.
 *
 * This is the research's answer to "is a pairing directional?" — it is not, in
 * general. `navy + white` is rated the same in both directions. What differs is
 * that white and cream TROUSERS are warm-weather items while navy trousers are
 * year-round, so direction functions as a SEASON GATE on specific colours rather
 * than as a global "darkest at the bottom" rule (which the research downgraded to
 * CONTESTED after a source rejected it as universal).
 *
 * Defined here for a later plan — nothing in production consumes this set yet
 * (only its own test does). Deliberately not wired up: it is the answer to a
 * seasonal-gate term the generator does not have. Leave the export in place
 * rather than deleting it; when the seasonal term lands, it reads from here so
 * the pairing table can stay direction-agnostic at ~741 cells instead of 1,482.
 */
export const WARM_WEATHER_ONLY: ReadonlySet<string> = new Set(["white", "cream", "ivory", "sand"]);
