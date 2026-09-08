/**
 * Metal as its own system, separate from the outfit's colour palette.
 *
 * ⚠️ **The distinction this file exists for.** `lib/closet/vocab.ts` marks
 * `silver` and `gold` `neutral: false`, and its comment justifies that with
 * "as hardware they rarely reach the tag set". That premise died the moment
 * accessories entered the closet: a quartz watch and a chain bracelet both tag
 * `colors: ["silver"]`, so a steel watch was spending one of the three slots
 * `colorHarmonyScore` counts, and adding a well-matched watch to an outfit
 * measurably LOWERED its score (0.9010 -> 0.8930 on an all-neutral look).
 *
 * The research is explicit: "Grey suit + black shoes/belt + silver watch ->
 * palette count 2-3 — silver hardware is normally not garment hue", and more
 * generally "treat accessories and base layers as structured style objects
 * rather than extra colours".
 *
 * ⚠️ **Keyed on the MATERIAL, never the colour name.** A silver puffer jacket
 * is a deliberate colour choice and must keep counting against the ceiling; a
 * steel watch case is hardware and must not. Gating on the colour would break
 * the first case — the same palette-class-versus-role confusion that `echo.ts`
 * already had to untangle for accents.
 */

/** The metal families the research groups hardware into. */
export type MetalTone = "cool" | "warm" | "dark";

/**
 * Materials that make an item hardware rather than cloth.
 *
 * Drawn from the tagger's own `MATERIALS` vocabulary (lib/ai/tagging-schema.ts)
 * so this can never name a material the model cannot emit.
 */
const METAL_MATERIALS = new Set(["stainless steel", "silver", "gold"]);

/** Colours that read as a dark metal — gunmetal, black hardware, PVD. */
const DARK_METAL_COLOURS = new Set(["black", "charcoal"]);

/** Colours that read as a warm metal. */
const WARM_METAL_COLOURS = new Set(["gold", "bronze", "brass", "copper", "rust"]);

/**
 * The metal family this item belongs to, or `null` if it is not hardware.
 *
 * `null` is the answer for every garment, which is what makes this safe to call
 * everywhere: cloth is unaffected by definition.
 *
 * The material decides WHETHER it is metal; the colour then decides WHICH
 * family, because a blackened steel case and a polished one are the same
 * material and different systems. A metal item whose colour says nothing useful
 * falls back to the family implied by its material.
 */
export function metalTone(
  material: string | null | undefined,
  colors: readonly string[] = [],
): MetalTone | null {
  if (!material) return null;
  const m = material.trim().toLowerCase();
  if (!METAL_MATERIALS.has(m)) return null;

  const cs = colors.map((c) => c.trim().toLowerCase());
  if (cs.some((c) => DARK_METAL_COLOURS.has(c))) return "dark";
  if (cs.some((c) => WARM_METAL_COLOURS.has(c))) return "warm";
  if (m === "gold") return "warm";
  return "cool";
}

/** Whether this item is hardware, and so outside the garment colour palette. */
export function isHardware(
  material: string | null | undefined,
  colors: readonly string[] = [],
): boolean {
  return metalTone(material, colors) !== null;
}
