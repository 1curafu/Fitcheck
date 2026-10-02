import { setSaved } from "../actions";

const db = vi.hoisted(() => ({
  user: "owner" as string | null,
  rows: [] as { id: string; user_id: string; saved_at: string | null }[],
  error: null as string | null,
  readError: false,
  writes: 0,
  from: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: db.user ? { id: db.user } : null } }) }, from: db.from,
}) }));
vi.mock("@/lib/i18n/revalidate", () => ({ revalidateEverywhere: db.revalidate }));

const id = "a2000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.useFakeTimers().setSystemTime(new Date("2026-10-02T12:00:00Z"));
  db.user = "owner"; db.error = null; db.readError = false; db.writes = 0;
  db.rows = [{ id, user_id: "owner", saved_at: null }];
  db.from.mockClear(); db.revalidate.mockClear();
  db.from.mockImplementation(() => {
    let patch: { saved_at: string | null } | undefined;
    const filters: ((r: typeof db.rows[number]) => boolean)[] = [];
    const execute = () => {
      if (db.error || (!patch && db.readError)) return { data: null, error: { message: db.error ?? "read failed" } };
      const rows = db.rows.filter(row => filters.every(f => f(row)));
      if (patch) rows.forEach(row => { Object.assign(row, patch); db.writes++; });
      return { data: rows, error: null };
    };
    const q = {
      update: (value: { saved_at: string | null }) => { patch = value; return q; },
      select: () => q,
      eq: (key: keyof typeof db.rows[number], value: unknown) => { filters.push(r => r[key] === value); return q; },
      is: (key: keyof typeof db.rows[number], value: unknown) => { filters.push(r => r[key] === value); return q; },
      maybeSingle: async () => { const result = execute(); return { ...result, data: result.data?.[0] ?? null }; },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(execute()).then(resolve),
    };
    return q;
  });
});
afterEach(() => vi.useRealTimers());

test("a signed-out request cannot save", async () => {
  db.user = null;
  await expect(setSaved(id, true)).rejects.toThrow("Not signed in");
  expect(db.writes).toBe(0);
});

test("malformed identifiers do not reach persistence", async () => {
  expect(await setSaved("bad", true)).toEqual({ status: "missing" });
  expect(db.from).not.toHaveBeenCalled();
});

test("a new save persists the date and revalidates detail and collection", async () => {
  expect(await setSaved(id, true)).toEqual({ status: "saved" });
  expect(db.rows[0].saved_at).toBe("2026-10-02T12:00:00.000Z");
  expect(db.revalidate.mock.calls).toEqual([[`/outfits/${id}`], ["/outfits"]]);
});

test("re-saving preserves the original date without another write", async () => {
  db.rows[0].saved_at = "2026-10-01T12:00:00Z";
  expect(await setSaved(id, true)).toEqual({ status: "saved" });
  expect(db.rows[0].saved_at).toBe("2026-10-01T12:00:00Z");
  expect(db.writes).toBe(0);
});

test.each([true, false])("another owner's look cannot be changed (saved=%s)", async saved => {
  db.rows[0].user_id = "other";
  expect(await setSaved(id, saved)).toEqual({ status: "missing" });
  expect(db.writes).toBe(0);
  expect(db.revalidate).not.toHaveBeenCalled();
});

test("the database limit is a product result, with no claimed save", async () => {
  db.error = "saved_outfits_limit";
  expect(await setSaved(id, true)).toEqual({ status: "limit" });
  expect(db.rows[0].saved_at).toBeNull();
  expect(db.revalidate).not.toHaveBeenCalled();
});

test("unsaving clears the date", async () => {
  db.rows[0].saved_at = "2026-10-01T12:00:00Z";
  expect(await setSaved(id, false)).toEqual({ status: "unsaved" });
  expect(db.rows[0].saved_at).toBeNull();
});

test("unexpected write errors are surfaced", async () => {
  db.error = "offline";
  await expect(setSaved(id, true)).rejects.toThrow("offline");
});

test("an idempotency read error does not claim success or missing", async () => {
  db.rows[0].saved_at = "2026-10-01T12:00:00Z";
  db.readError = true;
  await expect(setSaved(id, true)).rejects.toThrow("read failed");
});

test("malformed save intent does not reach persistence", async () => {
  expect(await setSaved(id, "false" as never)).toEqual({ status: "missing" });
  expect(db.writes).toBe(0);
});
