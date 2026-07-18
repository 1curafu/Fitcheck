import { scoreCombo, type ScoreItem, type Ctx } from "./score";

export function rankTopN<T extends ScoreItem>(combos: T[][], ctx: Ctx, n = 20) {
  return combos
    .map((items) => ({ items, score: scoreCombo(items, ctx) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
