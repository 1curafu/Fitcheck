import { clearTodaysDrop } from "../clear-today";

test("deletes today's looks and their pieces, keyed on the given timezone", async () => {
  const calls: string[] = [];
  const eqs: [string, unknown][] = [];
  const del = (table: string) => ({ in: async (_c: string, ids: string[]) => { calls.push(`${table}:${ids.join(",")}`); return { error: null }; } });
  const supabase = {
    from: (table: string) => ({
      select: () => {
        const q = { eq: (c: string, v: unknown) => { eqs.push([c, v]); return q; },
          then: (r: (x: unknown) => unknown) => Promise.resolve({ data: [{ id: "o1" }, { id: "o2" }] }).then(r) };
        return q;
      },
      delete: () => del(table),
    }),
  };
  vi.useFakeTimers().setSystemTime(new Date("2026-09-30T23:30:00Z")); // already 1 Oct in Zurich
  await clearTodaysDrop(supabase as never, "u1", "Europe/Zurich");
  vi.useRealTimers();
  expect(eqs).toEqual([["user_id", "u1"], ["generated_on", "2026-10-01"]]);
  expect(calls).toEqual(["outfit_items:o1,o2", "outfits:o1,o2"]);
});

const clientWith = (o: { read?: { data: { id: string }[] | null; error: unknown }; delItems?: unknown; delOutfits?: unknown }) => ({
  from: (table: string) => ({
    select: () => {
      const q = { eq: () => q, then: (r: (x: unknown) => unknown) => Promise.resolve(o.read ?? { data: [{ id: "o1" }], error: null }).then(r) };
      return q;
    },
    delete: () => ({ in: async () => (table === "outfit_items" ? o.delItems : o.delOutfits) ?? { error: null } }),
  }),
});

test("a failed read of today's looks is an error, not a silent no-op", async () => {
  await expect(clearTodaysDrop(clientWith({ read: { data: null, error: new Error("read") } }) as never, "u1", "UTC")).rejects.toThrow("read");
});

test("a failed delete is an error, so the caller never reports a rebuild that did not happen", async () => {
  await expect(clearTodaysDrop(clientWith({ delItems: { error: new Error("items") } }) as never, "u1", "UTC")).rejects.toThrow("items");
  await expect(clearTodaysDrop(clientWith({ delOutfits: { error: new Error("outfits") } }) as never, "u1", "UTC")).rejects.toThrow("outfits");
});
