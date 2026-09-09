import type { CandidateItem } from "./candidates";
import type { DescItem } from "./rerank";

/**
 * The one place an item ROW becomes a generator candidate.
 *
 * ⚠️ This exists because the mapping lived as three identical literals — the
 * daily generate action, "style this item", and the stats closet — plus a raw
 * cast in packing. That is a standing trap, and it has already sprung twice:
 * `bulk` and then `accent_color` were each tagged, stored, shown in the UI and
 * read by NOTHING, because a field reached the type and not the mapping.
 *
 * ⚠️ And nothing could see it. Every field on `CandidateItem` is optional, so
 * deleting one from a mapping still compiles; the mappings are inferred object
 * literals passed structurally, so no excess-property check fires either. A
 * branch-wide mutation sweep found eight of these survivors at once — every
 * producer could drop a field with no test and no type error. `from-row.test.ts`
 * is the guard the type cannot be.
 *
 * ⚠️ A producer that ignored this function and wrote its own literal would still
 * fail nothing here — server actions have no unit coverage, and the sweep
 * confirmed that hole. `__tests__/producers.test.ts` closes it at the source
 * level, which is the only level that can see it: the fields are optional so an
 * incomplete literal compiles, and making two of them required costs 113 type
 * errors across ~100 fixtures.
 */
export const CANDIDATE_COLUMNS = [
  "id",
  "category",
  "colors",
  "formality",
  "seasons",
  "material",
  "texture",
  "pattern",
  "accent_color",
  "subcategory",
  "bulk",
  "branding",
  "distressing",
] as const;

/** The column list for a Supabase `.select()`, so a query cannot drift from the mapping. */
export const CANDIDATE_SELECT = CANDIDATE_COLUMNS.join(", ");

type ItemRow = {
  id: string;
  category: string;
  colors: string[] | null;
  formality: number | null;
  seasons: string[] | null;
  material: string | null;
  texture: string | null;
  pattern: string | null;
  accent_color?: string | null;
  subcategory?: string | null;
  bulk?: string | null;
  branding?: string | null;
  distressing?: string | null;
};

export function toCandidateItem(row: ItemRow): CandidateItem {
  return {
    id: row.id,
    category: row.category,
    // Null-coalesced because the scorer iterates both without checking.
    colors: row.colors ?? [],
    formality: row.formality,
    seasons: row.seasons ?? [],
    material: row.material,
    texture: row.texture,
    pattern: row.pattern,
    accent_color: row.accent_color,
    subcategory: row.subcategory,
    bulk: row.bulk,
    branding: row.branding,
    distressing: row.distressing,
  };
}

/**
 * Everything the stylist needs about a shortlist: the outfit descriptions, and
 * the judgement calls raised by them.
 *
 * ⚠️ ONE function returning BOTH, deliberately. These were two independent
 * expressions duplicated across the daily generate action and "style this item",
 * and a mutation sweep found the second one unguarded: deleting `contested`
 * there broke no test and no type, silently returning the engine to resolving a
 * contested rule by itself. Deriving both from the same argument makes dropping
 * one a compile error rather than a quiet regression.
 */
export function stylistInputFor(
  shortlist: readonly { items: readonly { id: string }[]; verdict: { contested: string[] } }[],
  byId: ReadonlyMap<string, ItemRow & { name?: string | null }>,
): { combos: DescItem[][]; contested: string[] } {
  return {
    combos: shortlist.map((t) =>
      t.items.map((ci) => {
        const it = byId.get(ci.id)!;
        return {
          category: it.category,
          subcategory: it.subcategory,
          colors: it.colors ?? [],
          material: it.material,
          texture: it.texture,
          pattern: it.pattern,
          accent_color: it.accent_color,
          name: it.name,
        };
      }),
    ),
    // The same judgement call raised by ten candidates is still one question.
    contested: [...new Set(shortlist.flatMap((t) => t.verdict.contested))],
  };
}
