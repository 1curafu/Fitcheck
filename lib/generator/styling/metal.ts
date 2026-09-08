/**
 * Metal as its own system, separate from the outfit's colour palette.
 *
 * ⚠️ **The distinction this file exists for.** `lib/closet/vocab.ts` marks
 * `silver` and `gold` `neutral: false`, and its comment justified that with "as
 * hardware they rarely reach the tag set". That premise died the moment
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
 * ⚠️ **Metal reaches an outfit two ways, and BOTH must be recognised.** A steel
 * watch is metal by its material; a leather bag's silver buckle is metal by its
 * accent. Handling only the first is what broke `echo.ts` briefly: dropping the
 * bracelet's silver left the bag's silver accent with nothing to echo, so it
 * scored 0.35 as an orphaned loud colour — WORSE than the 0.5 the same bag gets
 * with no accent at all. Metal must leave the colour palette on both sides and
 * be answered here instead.
 */

/** The metal families the research groups hardware into. */
export type MetalTone = "cool" | "warm" | "dark";

/**
 * Materials that make an item hardware rather than cloth.
 *
 * Drawn from the tagger's own `MATERIALS` vocabulary (lib/ai/tagging-schema.ts)
 * so this can never name a material the model is unable to emit.
 */
const METAL_MATERIALS = new Set(["stainless steel", "silver", "gold"]);

/**
 * Colours that read as a metal.
 *
 * ⚠️ Exactly two, because the palette holds exactly two. `bronze`, `brass`,
 * `copper` and `gunmetal` are real metals and NOT real tag values — `vocab.ts`
 * defines 42 colours and none of them is any of those, so listing them would be
 * a rule that can never fire. Add them here if and when they join the palette.
 */
const METAL_COLOURS = new Set(["silver", "gold"]);

/** Metal colours that read warm rather than cool. */
const WARM_METAL_COLOURS = new Set(["gold"]);

/** Colours that turn a metal item into dark hardware — gunmetal, PVD, blackened. */
const DARK_METAL_COLOURS = new Set(["black", "charcoal"]);

/**
 * The metal family of an item that IS metal, or `null` if it is not hardware.
 *
 * `null` is the answer for every garment, which is what makes this safe to call
 * everywhere: cloth is unaffected by definition.
 *
 * ⚠️ **Keyed on the MATERIAL, never the colour name.** A silver puffer jacket is
 * a deliberate colour choice and must keep counting against the three-colour
 * ceiling; a steel watch case is hardware and must not. Gating on the colour
 * would break the first case — the palette-class-versus-role confusion
 * `echo.ts` already had to untangle for accents.
 *
 * The material decides WHETHER it is metal; the colour then decides WHICH
 * family, because a blackened case and a polished one share a material and
 * belong to different systems.
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

/**
 * The metal family of an ACCENT — a buckle, a zip, a clasp — or `null`.
 *
 * ⚠️ Judged on the colour here, which is the opposite of `metalTone` above, and
 * deliberately so: an accent is by definition the small hardware-or-logo detail
 * on a garment, so a silver accent on a leather bag IS a buckle in a way that a
 * silver leather bag is not a lump of metal. The asymmetry is the point.
 */
export function accentMetalTone(accent: string | null | undefined): MetalTone | null {
  if (!accent) return null;
  const a = accent.trim().toLowerCase();
  if (!METAL_COLOURS.has(a)) return null;
  return WARM_METAL_COLOURS.has(a) ? "warm" : "cool";
}

/** Whether this item is hardware, and so outside the garment colour palette. */
export function isHardware(
  material: string | null | undefined,
  colors: readonly string[] = [],
): boolean {
  return metalTone(material, colors) !== null;
}

/** Every metal family visible in this outfit, one entry per visible metal element. */
function visibleMetals(
  items: readonly { material?: string | null; colors?: readonly string[]; accent_color?: string | null }[],
): MetalTone[] {
  const tones: MetalTone[] = [];
  for (const i of items) {
    const body = metalTone(i.material, i.colors ?? []);
    if (body) tones.push(body);
    // An item can carry both: a steel watch with a gold bezel is two elements,
    // which is exactly the "two-tone watch connects both metals" case.
    const accent = accentMetalTone(i.accent_color);
    if (accent) tones.push(accent);
  }
  return tones;
}

/**
 * How well the visible metals agree, or `null` when there is nothing to judge.
 *
 * The research ranks one visible metal family as the safe default (+10), a
 * controlled 70/30 mix as acceptable (+5), and a four-way scramble as a penalty
 * (-8). On this codebase's 0..1 scale that is a PREFERENCE-strength term, not a
 * filter — mixed metals are a style choice, never a defect.
 *
 * ⚠️ Returns `null` below TWO metal elements, which is most outfits. One watch
 * cannot coordinate with itself, and "no evidence" must not be scored as 0.5 —
 * the contract `climateFit` established in score.ts. This is why the term costs
 * an outfit with no jewellery exactly nothing.
 */
export function metalCoordination(
  items: readonly { material?: string | null; colors?: readonly string[]; accent_color?: string | null }[],
): number | null {
  const tones = visibleMetals(items);
  if (tones.length < 2) return null;

  const counts = new Map<MetalTone, number>();
  for (const t of tones) counts.set(t, (counts.get(t) ?? 0) + 1);
  if (counts.size === 1) return 1;

  // One family clearly leading, the rest incidental — the research's 70/30.
  const leader = Math.max(...counts.values());
  return leader / tones.length >= 0.7 ? 0.6 : 0.25;
}
