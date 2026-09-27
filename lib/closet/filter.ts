export type ClosetItem = {
  id: string;
  category: string;
  colors: string[];
  formality: number | null;
  archived: boolean;
  [k: string]: unknown;
};
export type Filter = { category?: string | null; color?: string | null; archived?: boolean };

export function filterItems<T extends ClosetItem>(items: T[], f: Filter): T[] {
  return items.filter((i) => {
    // The closet shows active pieces; /closet/removed shows archived ones (spec 2026-09-26).
    if (Boolean(i.archived) !== Boolean(f.archived)) return false;
    if (f.category && f.category !== "All" && i.category !== f.category) return false;
    if (f.color && !i.colors.includes(f.color)) return false;
    return true;
  });
}
