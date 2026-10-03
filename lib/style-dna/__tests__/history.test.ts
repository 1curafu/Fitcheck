import { readAll, readWearHistory } from "../history";

type Row = Record<string, unknown>;

/** A PostgREST-shaped fake that, like the real API (`max_rows = 1000`), never returns more than `cap` rows per call. */
function fakeClient(tables: Record<string, Row[]>, cap = 1000, failOn?: string) {
  const calls: { table: string; inSize?: number; rows: number }[] = [];
  const from = (table: string) => {
    let rows = [...(tables[table] ?? [])];
    let range: [number, number] | null = null;
    let inSize: number | undefined;
    const q = {
      select: () => q,
      eq: (col: string, val: unknown) => { rows = rows.filter((r) => r[col] === val); return q; },
      in: (col: string, vals: unknown[]) => { inSize = vals.length; rows = rows.filter((r) => vals.includes(r[col])); return q; },
      order: () => q,
      range: (a: number, b: number) => { range = [a, b]; return q; },
      then: (resolve: (v: { data: Row[] | null; error: { message: string } | null }) => void) => {
        if (failOn === table) return resolve({ data: null, error: { message: `${table} failed` } });
        const data = (range ? rows.slice(range[0], range[1] + 1) : rows).slice(0, cap);
        calls.push({ table, inSize, rows: data.length });
        resolve({ data, error: null });
      },
    };
    return q;
  };
  return { client: { from } as never, calls };
}

const user = "u1";
const outfitId = (i: number) => `o${String(i).padStart(5, "0")}`;
/** 1200 worn looks (2 wears each), 3 pieces each, plus 4000 never-worn generated looks the page must not read. */
function history() {
  const logs = Array.from({ length: 2400 }, (_, i) => ({ id: `w${String(i).padStart(5, "0")}`, user_id: user, outfit_id: outfitId(i % 1200), worn_on: "2026-10-01" }));
  const outfits = Array.from({ length: 5200 }, (_, i) => ({ id: outfitId(i), user_id: user, occasion: i % 2 ? "work" : "weekend" }));
  const outfit_items = outfits.flatMap((o) => ["a", "b", "c"].map((p) => ({ outfit_id: o.id, item_id: `${o.id}-${p}` })));
  return { wear_logs: logs, outfits, outfit_items };
}

test("reads every wear and every worn look's pieces past the 1000-row response cap", async () => {
  const { client, calls } = fakeClient(history());
  const read = await readWearHistory(client, user);
  expect(read.logs).toHaveLength(2400);
  expect(read.outfits).toHaveLength(1200);
  expect(read.pieces).toHaveLength(3600);
  expect(calls.every((c) => c.rows <= 1000)).toBe(true);
});

test("only worn looks are read, in bounded chunks: never every generated look", async () => {
  const { client, calls } = fakeClient(history());
  await readWearHistory(client, user);
  const scoped = calls.filter((c) => c.table !== "wear_logs");
  expect(scoped.every((c) => c.inSize !== undefined && c.inSize <= 100)).toBe(true);
  expect(scoped.filter((c) => c.table === "outfit_items").reduce((n, c) => n + c.rows, 0)).toBe(3600);
});

test("a failed read throws instead of quietly returning a partial history", async () => {
  for (const table of ["wear_logs", "outfits", "outfit_items"]) {
    await expect(readWearHistory(fakeClient(history(), 1000, table).client, user)).rejects.toThrow(`${table} failed`);
  }
});

test("no wears means no look queries at all", async () => {
  const { client, calls } = fakeClient({ wear_logs: [], outfits: history().outfits, outfit_items: history().outfit_items });
  expect(await readWearHistory(client, user)).toEqual({ logs: [], outfits: [], pieces: [] });
  expect(calls.map((c) => c.table)).toEqual(["wear_logs"]);
});

test("readAll keeps paging until a short page", async () => {
  const rows = Array.from({ length: 2001 }, (_, i) => ({ id: i }));
  const { client, calls } = fakeClient({ items: rows });
  const all = await readAll<{ id: number }>((from, to) => (client as { from: (t: string) => { select: () => { range: (a: number, b: number) => PromiseLike<never> } } }).from("items").select().range(from, to));
  expect(all).toHaveLength(2001);
  expect(calls.map((c) => c.rows)).toEqual([1000, 1000, 1]);
});
