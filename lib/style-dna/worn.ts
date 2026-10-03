import type { CandidateItem } from "@/lib/generator/candidates";
import { pairingRating } from "@/lib/generator/styling/pairing-ratings";
import { GARMENTS } from "./closet";
import { pieceKind, type PieceKind } from "./kinds";

/** Wear logs needed before worn-look sections make a claim (spec D7). */
export const WEAR_MIN = 5;

export type WornLook = { outfitId: string; occasion: string | null; wears: number; items: CandidateItem[] };
export type Locked = { status: "locked"; have: number; need: number };

/** Logs → looks. A log whose outfit is gone, or a look with no live piece left, is skipped rather than counted. */
export function wornLooks(
  closet: readonly CandidateItem[],
  logs: readonly { outfit_id: string | null }[],
  outfits: readonly { id: string; occasion: string | null }[],
  pieces: readonly { outfit_id: string; item_id: string }[],
): WornLook[] {
  const byId = new Map(closet.map((item) => [item.id, item]));
  const occasions = new Map(outfits.map((o) => [o.id, o.occasion]));
  const itemsOf = new Map<string, CandidateItem[]>();
  for (const p of pieces) {
    const item = byId.get(p.item_id);
    if (item) itemsOf.set(p.outfit_id, [...(itemsOf.get(p.outfit_id) ?? []), item]);
  }
  const wears = new Map<string, number>();
  for (const log of logs) if (log.outfit_id && occasions.has(log.outfit_id)) wears.set(log.outfit_id, (wears.get(log.outfit_id) ?? 0) + 1);
  return [...wears].filter(([id]) => itemsOf.get(id)?.length).sort((a, b) => a[0].localeCompare(b[0]))
    .map(([outfitId, count]) => ({ outfitId, occasion: occasions.get(outfitId) ?? null, wears: count, items: itemsOf.get(outfitId)! }));
}

const total = (looks: readonly WornLook[]) => looks.reduce((sum, l) => sum + l.wears, 0);
const locked = (looks: readonly WornLook[]): Locked | null => total(looks) < WEAR_MIN ? { status: "locked", have: total(looks), need: WEAR_MIN } : null;
const best = <K>(counts: Map<K, number>, key: (k: K) => string) =>
  [...counts].sort((a, b) => b[1] - a[1] || key(a[0]).localeCompare(key(b[0])))[0];

export function statTrio(closet: readonly CandidateItem[], looks: readonly WornLook[]) {
  const byOccasion = new Map<string, number>();
  for (const l of looks) if (l.occasion) byOccasion.set(l.occasion, (byOccasion.get(l.occasion) ?? 0) + l.wears);
  const counted = [...byOccasion.values()].reduce((a, b) => a + b, 0);
  const top = best(byOccasion, (k) => k);
  return {
    pieces: closet.length,
    looksWorn: total(looks),
    occasion: top && counted ? { key: top[0], share: top[1] / counted } : null,
    colours: new Set(closet.filter((i) => GARMENTS.has(i.category) && i.colors[0]).map((i) => i.colors[0])).size,
  };
}

function core(items: readonly CandidateItem[]): PieceKind[] | null {
  const first = (category: string) => items.find((i) => i.category === category);
  const shoes = first("Shoes");
  const parts = first("One-piece") ? [first("One-piece"), shoes] : [first("Tops"), first("Bottoms"), shoes];
  const kinds = parts.map((p) => (p ? pieceKind(p) : null));
  return kinds.every((k): k is PieceKind => k != null) ? kinds : null;
}

export function formula(looks: readonly WornLook[]): Locked | { status: "none" } | { status: "found"; kinds: PieceKind[]; wears: number } {
  const gate = locked(looks);
  if (gate) return gate;
  const counts = new Map<string, number>();
  for (const l of looks) {
    const kinds = core(l.items);
    if (kinds) counts.set(kinds.join("|"), (counts.get(kinds.join("|")) ?? 0) + l.wears);
  }
  const top = best(counts, (k) => k);
  return top && top[1] >= 2 ? { status: "found", kinds: top[0].split("|") as PieceKind[], wears: top[1] } : { status: "none" };
}

export function signature(looks: readonly WornLook[]): Locked | { status: "none" } | { status: "found"; pieces: { id: string; wears: number }[] } {
  const gate = locked(looks);
  if (gate) return gate;
  const counts = new Map<string, number>();
  for (const l of looks) for (const item of l.items) if (item.category !== "Fragrance") counts.set(item.id, (counts.get(item.id) ?? 0) + l.wears);
  const pieces = [...counts].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3)
    .map(([id, wears]) => ({ id, wears }));
  return pieces.length ? { status: "found", pieces } : { status: "none" };
}

export function pairing(looks: readonly WornLook[]):
  Locked | { status: "none" } | { status: "found"; colors: [string, string]; wears: number; verdict: "classic" | "good" | "yours" } {
  const gate = locked(looks);
  if (gate) return gate;
  const counts = new Map<string, number>();
  for (const l of looks) {
    const colours = [...new Set(l.items.filter((i) => GARMENTS.has(i.category) && i.colors[0]).map((i) => i.colors[0]))].sort();
    for (let i = 0; i < colours.length; i++) for (let j = i + 1; j < colours.length; j++) {
      const key = `${colours[i]}|${colours[j]}`;
      counts.set(key, (counts.get(key) ?? 0) + l.wears);
    }
  }
  const top = best(counts, (k) => k);
  if (!top || top[1] < 2) return { status: "none" };
  const [a, b] = top[0].split("|") as [string, string];
  const rating = pairingRating(a, b) ?? 0;
  return { status: "found", colors: [a, b], wears: top[1], verdict: rating >= 4 ? "classic" : rating === 3 ? "good" : "yours" };
}

export function dressy(closet: readonly CandidateItem[], looks: readonly WornLook[]):
  Locked | null | { status: "found"; owned: number; worn: number; verdict: "ownDressier" | "wearDressier" | "aligned" } {
  const gate = locked(looks);
  if (gate) return gate;
  const owned = closet.filter((i) => GARMENTS.has(i.category) && i.formality != null);
  let weight = 0;
  let sum = 0;
  for (const l of looks) for (const i of l.items) if (GARMENTS.has(i.category) && i.formality != null) { weight += l.wears; sum += i.formality * l.wears; }
  if (!owned.length || !weight) return null;
  const ownedMean = Math.round((owned.reduce((s, i) => s + i.formality!, 0) / owned.length) * 10) / 10;
  const wornMean = Math.round((sum / weight) * 10) / 10;
  const delta = ownedMean - wornMean;
  return { status: "found", owned: ownedMean, worn: wornMean, verdict: delta >= 0.5 ? "ownDressier" : delta <= -0.5 ? "wearDressier" : "aligned" };
}
