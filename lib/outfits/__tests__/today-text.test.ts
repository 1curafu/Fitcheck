import { beforeEach, afterEach, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ ensure: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../text-store", () => ({ ensureOutfitTexts: mock.ensure }));
import { prewarmTodayTexts, todayTranslationIds } from "../today-text";
import type { TextClient } from "../text-store";

function database(daily: string[], styled: string[] = [], error: unknown = null) {
  const queries: Array<{ calls: Array<[string, ...unknown[]]> }> = [];
  const from = vi.fn(() => {
    const index = queries.length;
    const calls: Array<[string, ...unknown[]]> = [];
    queries.push({ calls });
    const query: Record<string, unknown> = {};
    for (const method of ["select", "eq", "is", "not", "order", "limit"]) {
      query[method] = (...args: unknown[]) => { calls.push([method, ...args]); return query; };
    }
    query.then = (resolve: (value: unknown) => void) => Promise.resolve({
      data: (index === 0 ? daily : styled).map(id => ({ id })), error,
    }).then(resolve);
    return query;
  });
  return { client: { from } as unknown as TextClient, queries, from };
}
const ids = Array.from({ length: 18 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`);

beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-29T01:00:00Z")); });
afterEach(() => vi.useRealTimers());

it("uses the owner's local date, prioritizes daily, and excludes trip days", async () => {
  const db = database(ids.slice(0, 3), ids.slice(3));
  const selected = await todayTranslationIds(db.client, "owner", "America/Los_Angeles", new Date());
  expect(selected).toEqual(ids.slice(0, 12));
  for (const query of db.queries) {
    expect(query.calls).toContainEqual(["eq", "user_id", "owner"]);
    expect(query.calls).toContainEqual(["eq", "generated_on", "2026-09-28"]);
    expect(query.calls).toContainEqual(["is", "trip_id", null]);
  }
  expect(db.queries[0].calls).toContainEqual(["is", "styled_item_id", null]);
  expect(db.queries[0].calls).toContainEqual(["order", "look_index", { ascending: true }]);
  expect(db.queries[1].calls).toContainEqual(["not", "styled_item_id", "is", null]);
  expect(db.queries[1].calls).toContainEqual(["order", "created_at", { ascending: false }]);
  expect(db.queries[1].calls).toContainEqual(["limit", 9]);
});

it("deduplicates and never selects more than twelve or queries unnecessary styled rows", async () => {
  const db = database([ids[0], ids[0], ...ids.slice(1)]);
  expect(await todayTranslationIds(db.client, "owner", "UTC", new Date())).toEqual(ids.slice(0, 12));
  expect(db.from).toHaveBeenCalledOnce();
  expect(db.queries[0].calls).toContainEqual(["limit", 12]);
});

it("falls back to the UTC day for an invalid timezone", async () => {
  const db = database([]);
  await todayTranslationIds(db.client, "owner", "invalid/zone", new Date());
  expect(db.queries[0].calls).toContainEqual(["eq", "generated_on", "2026-09-29"]);
});

it("fails closed when the today's read fails", async () => {
  const db = database(ids, [], new Error("private database body"));
  await expect(prewarmTodayTexts(db.client, "owner", "uk", "UTC")).rejects.toThrow("Today look read failed");
  expect(mock.ensure).not.toHaveBeenCalled();
});

it("runs at most two batches sequentially through the claim boundary", async () => {
  const db = database(ids);
  let finish!: () => void;
  mock.ensure.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; })).mockResolvedValue({ texts: [], busyIds: [] });
  const pending = prewarmTodayTexts(db.client, "owner", "uk", "UTC");
  await vi.waitFor(() => expect(mock.ensure).toHaveBeenCalledOnce());
  expect(mock.ensure).toHaveBeenCalledWith(db.client, ids.slice(0, 6), "uk");
  finish();
  await pending;
  expect(mock.ensure).toHaveBeenCalledTimes(2);
  expect(mock.ensure).toHaveBeenLastCalledWith(db.client, ids.slice(6, 12), "uk");
});

it("does not claim anything when today has no looks", async () => {
  const db = database([]);
  await prewarmTodayTexts(db.client, "owner", "uk", "UTC");
  expect(mock.ensure).not.toHaveBeenCalled();
});
