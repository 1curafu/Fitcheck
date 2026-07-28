type Keyed = { id: string; category: string };

function slotId(items: Keyed[], category: string): string | undefined {
  return items.find((i) => i.category === category)?.id;
}

/**
 * Order and size the shortlist handed to the re-ranker.
 *
 * Ranking alone clusters: a neutral top harmonises with everything, so combos
 * containing it occupy most of the top of the list. Hand the model that raw and
 * it returns three variations of one outfit.
 *
 * So the shortlist is TIERED rather than filtered. Combos whose top and bottom
 * are both unused come first, then those with one unused slot, then the rest —
 * score-descending inside each tier. The model still sees maximally-distinct
 * options at the head of the list, so "the best 3" are naturally distinct, but
 * the tail is no longer thrown away.
 *
 * Why the tail matters: an earlier version returned ONLY the fully-distinct
 * combos (floor 3). On a real 21-item closet that handed the re-ranker 6
 * candidates in summer and 3 in winter, out of 48 and 21 valid ones — so
 * Regenerate could not return anything different, and shoe variation was
 * unreachable in every season. Three looks sharing trousers but differing in
 * top and shoes are three different looks; only a repeated COMBINATION is a
 * duplicate, and buildCandidates never emits one.
 */
export function diversify<T extends { items: Keyed[]; score: number }>(
  ranked: T[],
  n: number,
): T[] {
  const usedTops = new Set<string>();
  const usedBottoms = new Set<string>();
  const tier1: T[] = [];
  const tier2: T[] = [];
  const tier3: T[] = [];

  for (const r of ranked) {
    const top = slotId(r.items, "Tops");
    const bottom = slotId(r.items, "Bottoms");
    // A missing slot cannot collide — a shoes-only combo is not "sharing" a
    // top with anything, so it counts as fresh.
    const freshTop = top === undefined || !usedTops.has(top);
    const freshBottom = bottom === undefined || !usedBottoms.has(bottom);

    if (freshTop && freshBottom) {
      tier1.push(r);
      if (top !== undefined) usedTops.add(top);
      if (bottom !== undefined) usedBottoms.add(bottom);
    } else if (freshTop || freshBottom) {
      tier2.push(r);
    } else {
      tier3.push(r);
    }
  }

  return [...tier1, ...tier2, ...tier3].slice(0, n);
}
