import { describe, expect, test } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { planSweep } from "../sweep-orphan-uploads";

const OLD = "2026-01-01T00:00:00.000Z";
const CUTOFF = new Date("2026-06-01T00:00:00.000Z").getTime();
const RECENT = "2026-07-01T00:00:00.000Z";

type Item = { image_url: string; cutout_url: string | null; thumb_url: string | null };

/**
 * Mirrors the two provider limits the sweep must not trust: PostgREST returns at most 1,000 rows unless the query
 * pages with `range`, and Storage `list` returns 100 entries unless a limit is passed.
 */
function fakeDb(items: Item[], files: Record<string, string>) {
  const listing = (prefix: string) => {
    const children = new Map<string, { name: string; updated_at: string | null; metadata: { size: number } | null }>();
    for (const [path, updatedAt] of Object.entries(files)) {
      if (prefix && !path.startsWith(`${prefix}/`)) continue;
      const rest = prefix ? path.slice(prefix.length + 1) : path;
      const [name, ...deeper] = rest.split("/");
      children.set(name!, deeper.length ? { name: name!, updated_at: null, metadata: null } : { name: name!, updated_at: updatedAt, metadata: { size: 1 } });
    }
    return [...children.values()].sort((a, b) => a.name.localeCompare(b.name));
  };

  const query = () => {
    let from = 0;
    let to = 999;
    let ranged = false;
    const builder = {
      order: () => builder,
      range: (a: number, b: number) => {
        ranged = true;
        from = a;
        to = b;
        return builder;
      },
      then: (resolve: (value: { data: Item[]; error: null }) => unknown) => {
        const end = ranged ? Math.min(to, from + 999) : 999;
        return Promise.resolve({ data: items.slice(from, end + 1), error: null }).then(resolve);
      },
    };
    return builder;
  };

  return {
    from: () => ({ select: () => query() }),
    storage: {
      from: () => ({
        list: async (prefix: string, options?: { limit?: number; offset?: number }) => {
          const limit = options?.limit ?? 100;
          const offset = options?.offset ?? 0;
          return { data: listing(prefix).slice(offset, offset + limit), error: null };
        },
      }),
    },
  } as unknown as SupabaseClient;
}

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("orphan upload sweep", () => {
  test("never marks a referenced folder for deletion when there are more than 1,000 items", async () => {
    const owner = uuid(1);
    const items: Item[] = [];
    const files: Record<string, string> = {};
    // Row 1,001 (the one a single capped query drops) owns the folder that sorts FIRST in Storage, so the
    // truncation cannot hide behind the 100-entry listing limit.
    for (let i = 1; i <= 1001; i += 1) {
      const folder = i === 1001 ? "item-0000" : `item-${String(i).padStart(4, "0")}`;
      const path = `${owner}/${folder}/original.jpg`;
      items.push({ image_url: path, cutout_url: null, thumb_url: null });
      files[path] = OLD;
    }

    const plan = await planSweep(fakeDb(items, files), CUTOFF);

    expect(plan.doomed).toEqual([]);
  });

  test("sweeps an abandoned capture belonging to the 101st owner folder", async () => {
    const files: Record<string, string> = {};
    for (let i = 1; i <= 101; i += 1) files[`${uuid(i)}/abandoned/original.jpg`] = OLD;

    const plan = await planSweep(fakeDb([], files), CUTOFF);

    expect(plan.doomed).toContain(`${uuid(101)}/abandoned/original.jpg`);
    expect(plan.doomed).toHaveLength(101);
  });

  test("sweeps the 101st abandoned folder of one owner", async () => {
    const owner = uuid(1);
    const files: Record<string, string> = {};
    for (let i = 0; i < 101; i += 1) files[`${owner}/draft-${String(i).padStart(3, "0")}/original.jpg`] = OLD;

    const plan = await planSweep(fakeDb([], files), CUTOFF);

    expect(plan.doomed).toHaveLength(101);
  });

  test("keeps the age floor and reports stray files in live folders without deleting them", async () => {
    const owner = uuid(1);
    const files = {
      [`${owner}/live/original.jpg`]: OLD,
      [`${owner}/live/stray.jpg`]: OLD,
      [`${owner}/in-flight/original.jpg`]: RECENT,
      [`${owner}/abandoned/original.jpg`]: OLD,
    };
    const items = [{ image_url: `${owner}/live/original.jpg`, cutout_url: null, thumb_url: null }];

    const plan = await planSweep(fakeDb(items, files), CUTOFF);

    expect(plan.doomed).toEqual([`${owner}/abandoned/original.jpg`]);
    expect(plan.strays).toEqual([`${owner}/live/stray.jpg`]);
    expect(plan.tooYoung).toBe(1);
  });
});
