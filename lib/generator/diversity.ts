type Keyed = { id: string; category: string };

function slotId(items: Keyed[], category: string): string | undefined {
  return items.find((i) => i.category === category)?.id;
}

/**
 * Spread the shortlist across the wardrobe before the re-ranker sees it.
 *
 * Ranking alone clusters: a neutral top harmonises with everything, so combos
 * containing it occupy most of the top of the list. Hand that to the model and
 * it returns three variations of one outfit — not because it ignored the
 * instruction, but because that is what "the best 3" of a clustered list is.
 *
 * Constraining the INPUT is stronger than asking the model for variety in the
 * prompt: whichever three it picks from a diversified shortlist are distinct by
 * construction, with no compliance required.
 *
 * Greedy and score-ordered: walk the ranking, take a combo whose top and bottom
 * are both still unused, then backfill from the remainder. The best-scoring
 * combo is always kept and always first — diversity reorders what comes after
 * it, it never overrides the winner.
 *
 * Backfill matters: with two eligible tops, three distinct looks are impossible,
 * and repeating a garment is better than returning fewer candidates and starving
 * the re-ranker.
 */
export function diversify<T extends { items: Keyed[]; score: number }>(
  ranked: T[],
  n: number,
): T[] {
  const usedTops = new Set<string>();
  const usedBottoms = new Set<string>();
  const picked: T[] = [];
  const rest: T[] = [];

  for (const r of ranked) {
    if (picked.length >= n) {
      rest.push(r);
      continue;
    }
    const top = slotId(r.items, "Tops");
    const bottom = slotId(r.items, "Bottoms");
    // A missing slot cannot collide — an accessory-only or shoes-only combo is
    // not "sharing" a top with anything.
    const fresh =
      (top === undefined || !usedTops.has(top)) &&
      (bottom === undefined || !usedBottoms.has(bottom));

    if (!fresh) {
      rest.push(r);
      continue;
    }
    picked.push(r);
    if (top !== undefined) usedTops.add(top);
    if (bottom !== undefined) usedBottoms.add(bottom);
  }

  for (const r of rest) {
    if (picked.length >= n) break;
    picked.push(r);
  }
  return picked;
}
