import { diversify } from "@/lib/generator/diversity";

/**
 * "Style an outfit with this" — the pure parts.
 *
 * Deliberately free of any Supabase import so it stays testable under jsdom;
 * the persistence lives in `styled-store.ts`.
 */

/**
 * Narrow a ranked candidate list to the combos containing one piece.
 *
 * This is the whole of "pin the item": the generator already builds every valid
 * combination and ranks it, so styling around a chosen piece is a filter over
 * that work, not a second algorithm. Order is preserved, so the best combo
 * containing the piece stays the best.
 *
 * Returns empty when the piece fits nothing under the current band — the caller
 * widens the formality band and tries again rather than treating that as an
 * error, the same "a hard filter must never empty a required slot" rule the
 * generator already follows.
 */
export function pinItem<T extends { items: { id: string }[] }>(combos: T[], itemId: string): T[] {
  return combos.filter((c) => c.items.some((i) => i.id === itemId));
}

/**
 * The name to fall back to when the model does not supply one.
 *
 * A look with no name renders a blank headline on both the detail screen and
 * the index tabs, so there is always a name — built from the piece the look was
 * styled around, which is also the honest description of it.
 */
export function styledLookName(item: {
  name: string | null;
  subcategory: string | null;
  category: string;
}): string {
  return `Around the ${item.name ?? item.subcategory ?? item.category}`;
}

/**
 * The shortlist handed to the re-ranker for a styled look.
 *
 * The daily path calls `diversify` before the model sees anything; this path
 * shipped with `pinned.slice(0, 20)` and never got it. Ranking CLUSTERS — a
 * neutral top harmonises with everything, so the raw top of a pinned list is
 * near-identical and the model ends up choosing between twenty variations of
 * one idea, then returning the safest.
 *
 * Same reasoning that produced `lib/generator/diversity.ts` in PR #14/#15,
 * applied to the second consumer. `diversify` TIERS rather than filters, so
 * nothing is discarded and a closet too small to diversify still yields every
 * candidate — the collapse PR #15 fixed on the daily path cannot reappear here.
 *
 * It only reorders a list `pinItem` already filtered, so every combo still
 * contains the pinned piece.
 */
export function shortlistFor<T extends { items: { id: string; category: string }[]; score: number }>(
  pinned: T[],
  n = 20,
): T[] {
  return diversify(pinned, n);
}
