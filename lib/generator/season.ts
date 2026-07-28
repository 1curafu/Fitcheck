/**
 * Season is a PREFERENCE, not an eligibility gate.
 *
 * A hard season filter ran against every REQUIRED slot, so one narrowly-tagged
 * category could zero the entire result. Measured on a constructed closet — 10
 * tops, 4 bottoms, 4 shoes, every piece wearable, the trousers simply lacking a
 * Winter tag — the same wardrobe produced 40 combos in summer and 0 in winter,
 * with `missingCategory` blaming Bottoms. Outerwear and the Refine colour lean
 * both moved to the soft-preference model for exactly this reason; season now
 * follows them — it orders candidates and weights the score, and can never
 * eliminate one.
 *
 * The MEASURED signal still filters hard (`weatherRules`: rain excludes suede,
 * cold adds a layer). That is a real reading of the day. A season tag is a
 * coarse label derived from the calendar month, which is a much blunter
 * instrument and does not deserve veto power.
 */

/**
 * Does this item suit the season?
 *
 * Case-insensitive on purpose: the DB and the AI tagger store Title case
 * ("Winter", `lib/ai/tagging-schema.ts`) while the generator's test fixtures use
 * lower case. An untagged item counts as in-season — absence of tags is absence
 * of an opinion, not a reason to rank it last.
 */
export function inSeason(seasons: string[] | undefined, season: string | undefined): boolean {
  if (!season) return true;
  if (!seasons || seasons.length === 0) return true;
  const s = season.toLowerCase();
  return seasons.some((x) => x.toLowerCase() === s);
}

/** The fraction of a combo's pieces that suit the season. 1 = all of them. */
export function seasonFit(items: { seasons?: string[] }[], season: string | undefined): number {
  if (!items.length) return 1;
  return items.filter((i) => inSeason(i.seasons, season)).length / items.length;
}

/** Title case to match the DB tag vocabulary. */
export function currentSeason(d: Date): string {
  const m = d.getMonth();
  return m < 2 || m === 11 ? "Winter" : m < 5 ? "Spring" : m < 8 ? "Summer" : "Autumn";
}
