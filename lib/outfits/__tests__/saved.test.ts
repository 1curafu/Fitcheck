import { countSaved, listSaved } from "../saved";

function client(rows: Record<string, unknown>[], error?: string) {
  const queries: unknown[][] = [];
  const from = () => {
    const filters: ((r: Record<string, unknown>) => boolean)[] = [];
    let size = 100; const orders: { key: string; ascending: boolean }[] = [];
    const q = {
      select: (_cols: string, options?: { head?: boolean }) => { queries.push(["select", options]); return q; },
      eq: (key: string, value: unknown) => { filters.push(r => r[key] === value); return q; },
      not: (key: string, _op: string, value: unknown) => { filters.push(r => r[key] !== value); return q; },
      lt: (key: string, value: string) => { filters.push(r => String(r[key]) < value); return q; },
      or: (expression: string) => {
        const match = expression.match(/^saved_at.lt.(.+),and\(saved_at.eq.(.+),id.lt.(.+)\)$/);
        if (!match) throw new Error("Unexpected cursor filter");
        filters.push(r => String(r.saved_at) < match[1] || (r.saved_at === match[2] && String(r.id) < match[3]));
        return q;
      },
      order: (key: string, options: { ascending: boolean }) => { orders.push({ key, ascending: options.ascending ?? true }); return q; },
      limit: (limit: number) => { size = limit; return q; },
      then: (resolve: (value: unknown) => unknown) => {
        const matched = rows.filter(r => filters.every(f => f(r)));
        const sorted = [...matched].sort((a,b) => orders.reduce((result, { key, ascending }) => result || String(a[key]).localeCompare(String(b[key])) * (ascending ? 1 : -1), 0));
        return Promise.resolve({ data: sorted.slice(0, size), count: matched.length, error: error ? { message: error } : null }).then(resolve);
      },
    };
    return q;
  };
  return { from } as never;
}
const row = (id: string, savedAt: string | null, extra: Record<string, unknown> = {}) => ({
  id, user_id: "owner", look_name: id, occasion: "work", generated_on: "2026-10-01", trip_day: null,
  created_at: "2026-09-30T12:00:00Z", saved_at: savedAt, released_at: null, layout: {}, outfit_items: [], ...extra,
});

test("saved looks are newest first, including released history, excluding other owners and unsaved", async () => {
  const db = client([row("old", "2026-10-01T12:00:00Z", { released_at: "2026-10-02T12:00:00Z" }), row("new", "2026-10-02T12:00:00Z"), row("unsaved", null), row("other", "2026-10-03T12:00:00Z", { user_id: "other" })]);
  expect((await listSaved(db, "owner")).looks.map(r => r.id)).toEqual(["new", "old"]);
  expect(await countSaved(db, "owner")).toBe(2);
});

test("the thirty-first row enables another page without appearing on this one", async () => {
  const rows = Array.from({ length: 31 }, (_, i) => row(String(i), `2026-10-01T12:00:${String(i).padStart(2, "0")}Z`));
  const result = await listSaved(client(rows), "owner");
  expect(result.looks).toHaveLength(30);
  expect(result.more).toBe(true);
  expect(result.looks[0].id).toBe("30");
  expect(result.looks.at(-1)?.id).toBe("1");
});

test("the next page only includes older saves", async () => {
  const result = await listSaved(client([row("old", "2026-10-01T12:00:00Z"), row("cursor", "2026-10-02T12:00:00Z")]), "owner", "2026-10-02T12:00:00Z");
  expect(result.looks.map(r => r.id)).toEqual(["old"]);
  expect(result.more).toBe(false);
});

test("archived pieces remain in the collection and trip/legacy dates retain provenance", async () => {
  const result = await listSaved(client([row("trip", "2026-10-02T12:00:00Z", { generated_on: null, trip_day: "2026-09-28", outfit_items: [{ item_id: "piece", slot: "Tops", items: { archived: true } }] }), row("legacy", "2026-10-01T12:00:00Z", { generated_on: null })]), "owner");
  expect(result.looks[0]).toMatchObject({ date: "2026-09-28", pieces: [{ itemId: "piece", slot: "Tops", archived: true }] });
  expect(result.looks[1].date).toBe("2026-09-30");
});

test("read and count errors are not empty collections", async () => {
  await expect(listSaved(client([], "offline"), "owner")).rejects.toThrow("offline");
  await expect(countSaved(client([], "offline"), "owner")).rejects.toThrow("offline");
});

test("equal save timestamps page without losing boundary looks", async () => {
  const timestamp = "2026-10-02T12:00:00Z";
  const rows = Array.from({ length: 31 }, (_, i) => row(String(i).padStart(2, "0"), timestamp));
  const db = client(rows);
  const first = await listSaved(db, "owner");
  expect(first.looks[0].id).toBe("30");
  const last = first.looks.at(-1)!;
  const second = await listSaved(db, "owner", last.savedAt, last.id);
  expect([...first.looks, ...second.looks].map(r => r.id)).toEqual([...rows].reverse().map(r => r.id));
  expect(second.more).toBe(false);
});

test("exactly thirty saves do not offer an empty next page", async () => {
  const rows = Array.from({ length: 30 }, (_, i) => row(String(i), "2026-10-02T12:00:00Z"));
  expect((await listSaved(client(rows), "owner")).more).toBe(false);
});
