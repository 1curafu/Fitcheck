/**
 * How many times a single piece may be worn across one trip.
 *
 * ⚠️ **TOTAL wears, not re-wears.** The design comp's labels were ambiguous
 * between the two ("Never", "Once", "Up to twice" — is "Once" one wear or one
 * repeat?). These are not: `REWEAR_LABELS[1]` is "Worn twice" and `maxWears`
 * returns 2. Reconcile the comp's copy to these, not the other way round.
 *
 * ⚠️ **Per-category, and that is not a refinement — it is what stops the output
 * being absurd.** A flat "wear everything twice" on a 7-day trip asks for ~4
 * tops (fine), ~4 bottoms (questionable) and ~4 pairs of shoes (nobody packs
 * that). Outerwear and shoes re-wear almost indefinitely; tops re-wear least.
 */
const ALWAYS_REWEARABLE = new Set(["Outerwear", "Shoes", "Accessories"]);

/** Meter positions 1–5, in the plain language the labelled meter requires. */
export const REWEAR_LABELS = [
  "Fresh every day",
  "Worn twice",
  "Worn three times",
  "Worn four times",
  "As often as it works",
] as const;

/** One line per level explaining the trade the user is making. */
export const REWEAR_HINTS = [
  "Every day gets fresh clothes. Expect the largest suitcase.",
  "One repeat per piece — a middle path for shorter trips.",
  "The sweet spot: a week out of nine pieces, nothing worn tired.",
  "A lighter bag. Bottoms and knitwear carry most of the repeats.",
  "The smallest possible case. Two shirts and one trouser do the week.",
] as const;

export function maxWears(category: string, level: number, tripDays: number): number {
  // Clamped rather than validated: the level arrives from a meter position
  // stored in the database, and one bad row must not break a whole trip.
  const clamped = Math.min(5, Math.max(1, Math.round(level)));

  // Level 1 is absolute — fresh every day, coats included. Exempting outerwear
  // here would make "Fresh every day" quietly untrue.
  if (clamped === 1) return 1;

  if (ALWAYS_REWEARABLE.has(category)) return tripDays;

  // Bottoms sit one step looser than tops: a trouser outlasts a shirt.
  const allowance = category === "Bottoms" ? clamped + 1 : clamped;
  return Math.min(tripDays, allowance);
}
