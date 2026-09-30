import { beforeEach, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ result: { data: [] as { outfit_id: string; item_id: string }[] | null, error: null as { message: string } | null }, queried: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => ({ select: () => ({ in: async (_c: string, ids: string[]) => { db.queried(table, ids); return db.result; } }) }),
  }),
}));
import { styledCacheBreaksNogo } from "../styled-store";

const item = (id: string, extra: Record<string, unknown> = {}) => ({ id, category: "Tops", ...extra });
const items = [
  item("anchor", { distressing: "Ripped" }),
  item("tee", {}),
  item("ripped", { category: "Bottoms", distressing: "Ripped" }),
];

beforeEach(() => {
  db.queried.mockReset();
  db.result = { data: [], error: null };
});

it("a failed read of the cached pieces is an ERROR, never 'compliant' (fail closed)", async () => {
  // ⚠️ Found in review on the 0.6.0 release PR: the error was dropped and `data ?? []` made every cached look look empty,
  // so the no-go check passed and unchecked looks were served.
  db.result = { data: null, error: { message: "connection reset" } };
  await expect(styledCacheBreaksNogo(["o1"], items, ["ripped"], "anchor")).rejects.toThrow("connection reset");
});

it("a cached look holding a piece a no-go now blocks breaks it", async () => {
  db.result = { data: [{ outfit_id: "o1", item_id: "anchor" }, { outfit_id: "o1", item_id: "ripped" }], error: null };
  expect(await styledCacheBreaksNogo(["o1"], items, ["ripped"], "anchor")).toBe(true);
});

it("the styled piece itself is exempt — the user chose it", async () => {
  db.result = { data: [{ outfit_id: "o1", item_id: "anchor" }, { outfit_id: "o1", item_id: "tee" }], error: null };
  expect(await styledCacheBreaksNogo(["o1"], items, ["ripped"], "anchor")).toBe(false);
});

it("with no no-gos nothing is read at all", async () => {
  expect(await styledCacheBreaksNogo(["o1"], items, [], "anchor")).toBe(false);
  expect(db.queried).not.toHaveBeenCalled();
});

it("with nothing cached nothing is read either", async () => {
  expect(await styledCacheBreaksNogo([], items, ["ripped"], "anchor")).toBe(false);
  expect(db.queried).not.toHaveBeenCalled();
});
