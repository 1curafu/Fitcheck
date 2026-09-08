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
  // Achromatic — NEUTRAL, not cool.
  //
  // ⚠️ Changed 2026-09-08 after a measured inversion. With these as cool, a
  // white shirt + camel trousers + white sneakers counted 2 cool against 1 warm
  // and read as COOL-dominant; adding a camel bag made it a 2-2 "clash". Scored:
  // bare 0.8367, + black bag 0.8344, + camel bag 0.7924 — the engine preferred a
  // black bag to a camel one for a camel outfit, while the research rates a bag
  // echoing the lower as one of the strongest moves available.
  //
  // The principle is the one already stated below for `taupe` and `green`: a
  // colour that leans neither way must not manufacture a split the eye does not
  // see. A white shirt does not make an outfit read cool the way a navy one
  // does; black and grey are grounds that let warm or cool hues lead.
  //
  // Research confidence, which is NOT uniform: black, charcoal, grey, silver,
  // white are High; `stone` below is Medium-high; `denim` is Medium and the
  // weakest of the seven, because the label spans cold indigo and warm faded
  // washes — `indigo` stays cool as the way to say "definitely cool denim".
  //
  // ⚠️ This is the TEMPERATURE axis only. `vocab.ts` still marks silver
  // `neutral: false`, and that stays: a silver garment is a deliberate colour
  // choice against the three-colour ceiling even though it votes on neither
  // temperature. Palette class and temperature are different questions — the
  // same separation `echo.ts` makes between a colour's class and its role.
  black: "neutral", charcoal: "neutral", grey: "neutral", silver: "neutral", white: "neutral",
  // ⚠️ ivory and cream are WHITE WITH YELLOW UNDERTONES, not white. This one
  // row is the difference between the right shoe and the wrong one.
  ivory: "warm", cream: "warm",
  // Warm neutrals / earths
  // ⚠️ `stone` is the documented exception: a pale GREY-beige, the coolest of an
  // otherwise-warm family. Both earlier research rounds independently flagged
  // it — but the temperature research judges grey-beige too ambiguous to cast a
  // full cool vote (Medium-high confidence), which is the same reason `taupe`
  // below is neutral. Neutral avoids a false cool count either way.
  stone: "neutral",
  sand: "warm", beige: "warm",
  // `taupe` is a grey-brown sitting between warm beige and cool grey — the
  // research's explicit advice is to treat it as temperature-neutral in practice
  // rather than force it to a side.
  taupe: "neutral",
  khaki: "warm", camel: "warm", tan: "warm", caramel: "warm",
  chocolate: "warm", brown: "warm",
  // Blues
  // ⚠️ `denim` is neutral, and it is the weakest row in this table (Medium
  // confidence). The label covers cold indigo and warm faded stonewash alike,
  // so one temperature cannot be right for both. `indigo` stays cool and is the
  // tag to use for dark denim that genuinely reads cool.
  navy: "cool", indigo: "cool", denim: "neutral", blue: "cool", sky: "cool", teal: "cool",
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
