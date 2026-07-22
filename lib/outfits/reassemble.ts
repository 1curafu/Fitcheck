import type { Look, LookPiece, Slot } from "@/lib/generator/types";

export type StoredPiece = { itemId: string; slot: Slot };
export type StoredLook = {
  lookName: string;
  why: string;
  anchorIndex: number;
  pieces: StoredPiece[];
};
export type ItemRow = {
  id: string;
  category: string;
  subcategory: string | null;
  brand: string | null;
  name: string | null;
  colors: string[] | null;
};

/**
 * Rebuild today's stored looks for the screen, or return null if they can no
 * longer be rendered faithfully.
 *
 * Garment details (brand, name, colours) are read LIVE from `itemsById` rather
 * than from the stored row, so renaming an item in the closet is reflected in
 * today's look. Only the stylist's decisions — which items, in which slots, in
 * which order, and what it said about them — come from storage.
 *
 * Returning null (rather than a partial look) is deliberate: a closet edit
 * during the day must produce a fresh complete outfit, never one with a hole.
 */
export function reassembleLooks(
  stored: StoredLook[],
  itemsById: Map<string, ItemRow>,
  signed: Map<string, string>,
  pathFor: (itemId: string) => string | undefined,
): Look[] | null {
  const looks: Look[] = [];

  for (const s of stored) {
    const pieces: LookPiece[] = [];
    for (const p of s.pieces) {
      const item = itemsById.get(p.itemId);
      if (!item) return null; // item left the closet
      const path = pathFor(p.itemId);
      const url = path ? signed.get(path) : undefined;
      if (!url) return null; // image no longer signable
      pieces.push({
        itemId: item.id,
        category: item.category,
        subcategory: item.subcategory ?? null,
        brand: item.brand ?? null,
        name: item.name ?? null,
        colors: item.colors ?? [],
        cutoutUrl: url,
        slot: p.slot,
      });
    }
    looks.push({ name: s.lookName, why: s.why, pieces, anchorIndex: s.anchorIndex });
  }

  return looks;
}
