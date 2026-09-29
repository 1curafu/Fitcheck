import { beforeEach, describe, expect, it, vi } from "vitest";
import { SHARE_LIMITS } from "../snapshot";
import { listMine, prepare, publish, stateFor, stop } from "../store";
import uk from "@/messages/uk.json";

vi.mock("server-only", () => ({}));
const provider = vi.hoisted(() => vi.fn());
vi.mock("@/lib/outfits/translate", () => ({ translateOutfitText: provider }));
vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn() }));

const owner = "55555555-5555-4555-8555-555555555555";
const outfitId = "77777777-7777-4777-8777-777777777777";
const token = "AAAAAAAAAAAAAAAAAAAAAA";

let s: {
  outfit: Record<string, unknown> | null; links: { items: Record<string, unknown> }[];
  existing: { token: string; ready_at: string | null; purging_at?: string | null } | null; rowCount: number;
  listed: { name: string }[]; removeError: Error | null; calls: string[];
  inserted: Record<string, unknown>[]; updated: Record<string, unknown>[]; mine: Record<string, unknown>[]; cache: Record<string, unknown>[]; cacheError: Error | null;
};

/** A thenable query builder, mirroring supabase-js: every step returns the builder; awaiting it resolves. */
function builder(table: string) {
  let head = false;
  const b: Record<string, unknown> = {};
  const self = () => b;
  Object.assign(b, {
    select: (_c?: string, o?: { head?: boolean }) => { head = Boolean(o?.head); return b; },
    eq: self, not: self, order: self, is: self, in: self,
    maybeSingle: async () => ({ data: table === "outfits" ? s.outfit : s.existing, error: null }),
    single: async () => ({ data: { token }, error: null }),
    insert: (row: Record<string, unknown>) => { s.calls.push("insert"); s.inserted.push(row); return b; },
    update: (row: Record<string, unknown>) => { s.calls.push("update"); s.updated.push(row); return b; },
    delete: () => { s.calls.push("delete"); return b; },
    then: (resolve: (v: unknown) => void) => resolve(
      head ? { count: s.rowCount, error: null }
        : table === "outfit_items" ? { data: s.links, error: null }
        : table === "look_shares" ? { data: s.mine, error: null }
        : table === "outfit_text_translations" ? { data: s.cache, error: s.cacheError } : { data: null, error: null }),
  });
  return b;
}
const client = () => ({
  from: (t: string) => builder(t),
  storage: { from: () => ({
    list: async () => { s.calls.push("list"); return { data: s.listed, error: null }; },
    remove: async (paths: string[]) => { s.calls.push(`remove:${paths.join(",")}`); return { data: [], error: s.removeError }; },
  }) },
}) as never;

beforeEach(() => {
  provider.mockClear();
  s = {
    outfit: { id: outfitId, text_locale: "en-US", look_name: "Quiet Camel", occasion: "everyday", ai_reasoning: "Why." },
    links: [
      { items: { id: "b", name: "Cream knit", subcategory: null, category: "Tops", brand: "Hartley" } },
      { items: { id: "a", name: null, subcategory: "Overcoat", category: "Outerwear", brand: null } },
    ],
    existing: null, rowCount: 0, listed: [{ name: "story.jpg" }, { name: "post.jpg" }, { name: "og.jpg" }],
    removeError: null, calls: [], inserted: [], updated: [], mine: [], cache: [], cacheError: null,
  };
});

describe("prepare", () => {
  it("an unnamed original freezes the same localized title as outfit detail", async () => {
    (globalThis as {__intl?: {locale: string; messages: object}}).__intl = { locale: "uk", messages: uk };
    s.outfit!.look_name = null;
    const prepared = await prepare(client(), owner, { outfitId, showBrands: false, locale: "uk" });
    expect(prepared).toMatchObject({ text: { name: uk.outfit.todayLook } });
    expect(s.inserted[0]).toMatchObject({ look_name: uk.outfit.todayLook });
  });
  function readyCache() {
    return { outfit_id: outfitId, target_locale: "uk", source_locale: "en-US", source_name: "Quiet Camel",
      source_why: "Why.", name: "Тихий ранок", why: "Затишний образ.", status: "ready" };
  }
  it("freezes the ready cache in the snapshot and returned painter text without paid work", async () => {
    s.cache = [readyCache()];
    const prepared = await prepare(client(), owner, { outfitId, showBrands: true, locale: "uk" });
    expect(prepared).toEqual({ status: "ok", token, text: { name: "Тихий ранок", why: "Затишний образ." } });
    expect(s.inserted[0]).toMatchObject({ look_name: "Тихий ранок", reasoning: "Затишний образ." });
    expect(s.inserted[0].pieces).toEqual([
      { n: 1, name: "Overcoat", category: "Outerwear", brand: null },
      { n: 2, name: "Cream knit", category: "Tops", brand: "Hartley" },
    ]);
    expect(provider).not.toHaveBeenCalled();
  });
  it.each(["pending", "failed", "stale", "read-error"])("%s cache freezes the original", async state => {
    s.cache = [{ ...readyCache(), ...(state === "stale" ? { source_name: "Old words" } : state === "read-error" ? {} : { status: state }) }];
    if (state === "read-error") s.cacheError = new Error("private cache error");
    const prepared = await prepare(client(), owner, { outfitId, showBrands: false, locale: "uk" });
    expect(prepared).toMatchObject({ text: { name: "Quiet Camel", why: "Why." } });
    expect(s.inserted[0]).toMatchObject({ look_name: "Quiet Camel", reasoning: "Why." });
    expect(provider).not.toHaveBeenCalled();
  });
  it("refreshes an existing link with the latest valid cache and exact nullable source", async () => {
    s.existing = { token, ready_at: "2026-09-26T10:00:00Z" };
    s.outfit!.ai_reasoning = null;
    s.cache = [{ ...readyCache(), source_why: null, why: null }];
    expect(await prepare(client(), owner, { outfitId, showBrands: false, locale: "uk" }))
      .toMatchObject({ token, text: { name: "Тихий ранок", why: null } });
    expect(s.updated[0]).toMatchObject({ look_name: "Тихий ранок", reasoning: null, ready_at: null });
  });
  it("clips the look name, reason and occasion to the database limits", async () => {
    s.outfit = { id: outfitId, text_locale: "en-US", look_name: "L".repeat(500), occasion: "o".repeat(500), ai_reasoning: "w".repeat(5000) };
    const result = await prepare(client(), owner, { outfitId, showBrands: false, locale: "en-US" });
    const row = s.inserted[0] as { look_name: string; reasoning: string; occasion: string };
    expect(row.look_name).toHaveLength(SHARE_LIMITS.lookName);
    expect(row.reasoning).toHaveLength(SHARE_LIMITS.reasoning);
    expect(row.occasion).toHaveLength(SHARE_LIMITS.occasion);
    expect(result).toMatchObject({ text: { name: row.look_name, why: row.reasoning } });
  });

  it("builds the snapshot from the database, in reading order, without brands by default, and reads the minted token", async () => {
    expect(await prepare(client(), owner, { outfitId, showBrands: false, locale: "en-US" })).toEqual({ status: "ok", token, text: { name: "Quiet Camel", why: "Why." } });
    const row = s.inserted[0];
    expect(row).toMatchObject({ user_id: owner, outfit_id: outfitId, look_name: "Quiet Camel", reasoning: "Why.", show_brands: false });
    expect(row).not.toHaveProperty("token");
    expect(row).not.toHaveProperty("ready_at");
    expect(row.pieces).toEqual([
      { n: 1, name: "Overcoat", category: "Outerwear", brand: null },
      { n: 2, name: "Cream knit", category: "Tops", brand: null },
    ]);
  });

  it("includes brands only when asked", async () => {
    await prepare(client(), owner, { outfitId, showBrands: true, locale: "en-US" });
    expect((s.inserted[0].pieces as { brand: string | null }[]).map((p) => p.brand)).toEqual([null, "Hartley"]);
  });

  it("refreshes an existing link: same token, ready_at cleared until the new images are published (A7)", async () => {
    s.existing = { token, ready_at: "2026-09-26T10:00:00Z" };
    expect(await prepare(client(), owner, { outfitId, showBrands: true, locale: "en-US" })).toEqual({ status: "ok", token, text: { name: "Quiet Camel", why: "Why." } });
    expect(s.updated[0]).toMatchObject({ ready_at: null, show_brands: true });
    expect(s.inserted).toEqual([]);
  });

  it("stops at the cap with a message instead of inserting", async () => {
    s.rowCount = 100;
    expect(await prepare(client(), owner, { outfitId, showBrands: false, locale: "en-US" }))
      .toEqual({ status: "limited", message: "share.cap", values: { limit: 100 } });
    expect(s.inserted).toEqual([]);
  });

  it("refuses an unknown look", async () => {
    s.outfit = null;
    await expect(prepare(client(), owner, { outfitId, showBrands: false, locale: "en-US" })).rejects.toThrow("Not found");
  });
});

describe("publish", () => {
  it("publishes only when all three images exist", async () => {
    s.existing = { token, ready_at: null };
    s.listed = [{ name: "story.jpg" }, { name: "post.jpg" }];
    expect(await publish(client(), token)).toEqual({ status: "error", message: "share.publishFailed" });
    expect(s.updated).toEqual([]);
    s.listed = [{ name: "story.jpg" }, { name: "post.jpg" }, { name: "og.jpg" }];
    expect(await publish(client(), token)).toEqual({ status: "published" });
    expect(s.updated[0]).toHaveProperty("ready_at");
  });
  it("refuses a token that is not the caller's", async () => {
    await expect(publish(client(), token)).rejects.toThrow("Not found");
  });
});

describe("stop", () => {
  it("claims the row before Storage cleanup so new uploads are denied", async () => {
    s.existing = { token, ready_at: "x" };
    s.listed = [];
    await stop(client(), token);
    expect(s.calls[0]).toBe("update");
    expect(s.updated[0]).toHaveProperty("purging_at");
  });
  it("removes and verifies the images BEFORE deleting the row", async () => {
    s.existing = { token, ready_at: "x" };
    s.listed = [];
    expect(await stop(client(), token)).toEqual({ status: "stopped" });
    expect(s.calls).toEqual(["update", `remove:${token}/story.jpg,${token}/post.jpg,${token}/og.jpg`, "list", "delete"]);
  });
  it("keeps the row when Storage fails or an image is still listed", async () => {
    s.existing = { token, ready_at: "x" };
    s.removeError = new Error("down");
    expect(await stop(client(), token)).toEqual({ status: "error", message: "share.cleanupFailed" });
    s.removeError = null;
    s.listed = [{ name: "og.jpg" }];
    expect((await stop(client(), token)).status).toBe("error");
    expect(s.calls).not.toContain("delete");
  });
});

describe("state and list", () => {
  it("reports the caller's link for a look, and lists all of theirs", async () => {
    s.existing = { token, ready_at: "2026-09-26T10:00:00Z" };
    expect(await stateFor(client(), outfitId)).toEqual({ token, readyAt: "2026-09-26T10:00:00Z" });
    s.mine = [{ token, look_name: "Quiet Camel", ready_at: null, created_at: "2026-09-26T09:00:00Z" }];
    expect(await listMine(client())).toEqual([{ token, lookName: "Quiet Camel", readyAt: null, createdAt: "2026-09-26T09:00:00Z" }]);
  });
  it("reports a claimed link as unavailable and lets Settings show cleanup in progress", async () => {
    s.existing = { token, ready_at: "2026-09-26T10:00:00Z", purging_at: "2026-09-27T10:00:00Z" };
    expect(await stateFor(client(), outfitId)).toEqual({ token, readyAt: null, purgingAt: "2026-09-27T10:00:00Z" });
    s.mine = [{ token, look_name: "Quiet Camel", ready_at: "2026-09-26T10:00:00Z",
      purging_at: "2026-09-27T10:00:00Z", created_at: "2026-09-26T09:00:00Z" }];
    expect(await listMine(client())).toEqual([{ token, lookName: "Quiet Camel", readyAt: "2026-09-26T10:00:00Z",
      purgingAt: "2026-09-27T10:00:00Z", createdAt: "2026-09-26T09:00:00Z" }]);
  });
});
