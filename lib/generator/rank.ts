import { scoreCombo, type ScoreItem, type Ctx } from "./score";
import { detectFrame } from "./frame";
import { applyRules, relieve, type Verdict } from "./styling/registry";

/**
 * How much of the score a fully-repeated combo gives up on a regenerate.
 *
 * Sized like `WEIGHTS.lean` in score.ts and for the same reason: big enough to
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

export type Ranked<T> = { items: T[]; score: number; verdict: Verdict };

/**
 * Score every combo, apply the rule registry, and return the best `n`.
 *
 * ⚠️ The registry runs HERE rather than inside `scoreCombo`, and that is the
 * point: `scoreCombo` answers "how good is this outfit" on a 0..1 budget, while
 * a HARD rule answers "should this outfit exist at all" — a question no weighted
 * average can express. Folding exclusion into the score would mean picking a
 * penalty large enough to always win, which is a hard rule wearing a weight's
 * clothing and drifts the moment another term is added.
 *
 * The frame is detected per COMBO, not per user: the same closet produces
 * classic and streetwear outfits depending on which pieces are in play.
 */
export function rankTopN<T extends ScoreItem & { id: string }>(
  combos: T[][],
  ctx: Ctx,
  n = 20,
): Ranked<T>[] {
  const recent = new Set(ctx.recentlyShown ?? []);
  const scored = combos.map((items) => {
    const verdict = applyRules({ frame: detectFrame(items), items: items as never });
    return {
      items,
      verdict,
      score: Math.max(
        0,
        scoreCombo(items, ctx) - recencyPenalty(items, recent) - verdict.penalty + verdict.bonus,
      ),
    };
  });

  return relieve(scored)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
