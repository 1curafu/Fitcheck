import { loadDailyLooks, saveDailyLooks } from "../daily";
import { clearStyledLooks, loadStyledLooks } from "../styled-store";
import { clearTodaysDrop } from "../clear-today";
import { todayTranslationIds } from "../today-text";
import { saveTripLooks } from "@/lib/packing/store";
import type { WeatherPayload } from "@/lib/generator/types";

vi.mock("server-only", () => ({}));
vi.mock("../text-store", () => ({
  readOutfitTexts: async (_client: unknown, sources: { name: string; why: string | null }[]) => sources.map(s => ({ ...s, translated: false })),
  ensureOutfitTexts: vi.fn(),
}));
const db = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  operations: [] as string[],
  failRelease: false,
  failDelete: false,
  from: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => db }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-02T12:00:00Z"));
  db.operations = []; db.failRelease = false; db.failDelete = false;
  db.rows = ["saved", "unsaved"].map((id, i) => ({
    id, user_id: "owner", occasion: "everyday", generated_on: "2026-10-02",
    trip_id: null, styled_item_id: null, saved_at: i ? null : "2026-10-01T12:00:00Z",
    released_at: null, look_index: i, styled_index: i, wear_logs: [],
    layout: { pieces: [{ itemId: "piece", slot: {} }] }, look_name: id, text_locale: "en-US", ai_reasoning: null,
  }));
  db.from.mockImplementation((table: string) => {
    let mode = "read";
    let patch: Record<string, unknown> = {};
    const filters: ((r: Record<string, unknown>) => boolean)[] = [];
    const q: Record<string, unknown> = {};
    q.select = q.order = q.limit = () => q;
    q.eq = (key: string, value: unknown) => { filters.push(r => r[key] === value); return q; };
    q.is = (key: string, value: unknown) => { filters.push(r => (r[key] ?? null) === value); return q; };
    q.not = (key: string, op: string, value: unknown) => {
      filters.push(r => op === "is" ? (r[key] ?? null) !== value : !String(value).includes(String(r[key])));
      return q;
    };
    q.in = (key: string, values: unknown[]) => { filters.push(r => values.includes(r[key])); return q; };
    q.update = (values: Record<string, unknown>) => { mode = "release"; patch = values; return q; };
    q.delete = () => { mode = "delete"; return q; };
    q.insert = () => { mode = "insert"; return q; };
    q.then = (resolve: (value: unknown) => unknown) => {
      const rows = table === "outfits" ? db.rows.filter(r => filters.every(f => f(r))) : [];
      if (mode !== "read") db.operations.push(`${table}:${mode}`);
      const error = mode === "release" && db.failRelease ? { message: "release failed" }
        : mode === "delete" && db.failDelete ? { message: "delete failed" } : null;
      if (!error && table === "outfits") {
        if (mode === "release") rows.forEach(r => Object.assign(r, patch));
        if (mode === "delete") db.rows = db.rows.filter(r => !rows.includes(r));
      }
      return Promise.resolve({ data: mode === "insert" ? [] : rows, error }).then(resolve);
    };
    return q;
  });
});
afterEach(() => vi.useRealTimers());

async function replace(kind: string) {
  if (kind === "daily") await saveDailyLooks("owner", "everyday", "2026-10-02", {} as WeatherPayload, []);
  if (kind === "styled") {
    db.rows.forEach(r => { r.styled_item_id = "anchor"; });
    await clearStyledLooks("owner", "anchor", "2026-10-02");
  }
  if (kind === "settings") await clearTodaysDrop(db as never, "owner", "UTC");
  if (kind === "trip") {
    db.rows.forEach(r => { r.trip_id = "trip"; });
    await saveTripLooks("owner", "trip", [], []);
  }
}

test.each(["daily", "styled", "settings", "trip"])("%s replacement retains saved identity and pieces outside the active set", async kind => {
  await replace(kind);
  expect(db.rows).toHaveLength(1);
  expect(db.rows[0]).toMatchObject({ id: "saved", saved_at: "2026-10-01T12:00:00Z", released_at: "2026-10-02T12:00:00.000Z", look_index: null, styled_index: null, generated_on: "2026-10-02", layout: { pieces: [{ itemId: "piece" }] } });
  expect(db.operations.slice(0, 2)).toEqual(["outfits:release", "outfits:delete"]);
  expect(db.operations).not.toContain("outfit_items:delete");
});

test.each(["daily", "styled", "settings", "trip"])("%s never deletes after a failed release", async kind => {
  db.failRelease = true;
  await expect(replace(kind)).rejects.toThrow("release failed");
  expect(db.rows.map(r => r.id)).toEqual(["saved", "unsaved"]);
  expect(db.operations).not.toContain("outfits:delete");
});

test("daily regeneration leaves a worn look pinned", async () => {
  db.rows[0].wear_logs = [{ worn_on: "2026-10-02" }];
  await replace("daily");
  expect(db.rows[0]).toMatchObject({ id: "saved", released_at: null, look_index: 0 });
});

test("daily reads exclude released saved looks", async () => {
  db.rows[0].released_at = "2026-10-01T12:00:00Z";
  expect((await loadDailyLooks("owner", "everyday", "2026-10-02"))?.map(r => r.id)).toEqual(["unsaved"]);
});

test("styled reads exclude released saved looks", async () => {
  db.rows.forEach(r => { r.styled_item_id = "anchor"; });
  db.rows[0].released_at = "2026-10-01T12:00:00Z";
  expect(await loadStyledLooks("owner", "anchor", "2026-10-02")).toEqual(["unsaved"]);
});

test.each([false, true])("today text prewarm excludes released daily/styled looks (styled=%s)", async styled => {
  if (styled) db.rows.forEach(r => { r.styled_item_id = "anchor"; });
  db.rows[0].released_at = "2026-10-01T12:00:00Z";
  expect(await todayTranslationIds(db as never, "owner", "UTC", new Date())).toEqual(["unsaved"]);
});
