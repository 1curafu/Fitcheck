import { scoreCombo, type ScoreItem, type Ctx } from "./score";

/**
 * How much of the score a fully-repeated combo gives up on a regenerate.
 *
 * Sized like LEAN_WEIGHT in score.ts and for the same reason: big enough to
 * decisively reorder near-ties (which is what the top of a ranked shortlist
 * is), small enough that a genuinely better outfit repeating one piece still
 * beats a mediocre fresh one. It is a preference, never an eliminator.
 */
export const RECENT_WEIGHT = 0.25;

/** Fraction of a combo's pieces the user was just shown, 0..1. */
function recencyPenalty(items: { id: string }[], recent: Set<string>): number {
  if (!recent.size || !items.length) return 0;
  const hits = items.filter((i) => recent.has(i.id)).length;
  return RECENT_WEIGHT * (hits / items.length);
}

export function rankTopN<T extends ScoreItem & { id: string }>(combos: T[][], ctx: Ctx, n = 20) {
  const recent = new Set(ctx.recentlyShown ?? []);
  return combos
    .map((items) => ({
      items,
      score: Math.max(0, scoreCombo(items, ctx) - recencyPenalty(items, recent)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
