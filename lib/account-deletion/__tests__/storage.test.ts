import { describe, expect, it, vi } from "vitest";
import { collectWardrobePaths, listWardrobeOwnerIds, purgeWardrobePrefix } from "../storage.mjs";

const USER = "11111111-1111-4111-8111-111111111111";
function fake(initial: string[] = []) {
  const files = new Set(initial);
  const list = vi.fn(async (prefix: string, options: { limit: number; offset: number }) => {
    const entries = new Map<string, { name: string; id: string | null }>();
    for (const file of files) {
      if (!file.startsWith(`${prefix}/`)) continue;
      const rest = file.slice(prefix.length + 1);
      const name = rest.split("/")[0];
      entries.set(name, { name, id: rest.includes("/") ? null : "file-id" });
    }
    return { data: [...entries.values()].sort((a, b) => a.name.localeCompare(b.name)).slice(options.offset, options.offset + options.limit), error: null };
  });
  const remove = vi.fn(async (paths: string[]) => {
    paths.forEach((path) => files.delete(path));
    return { data: [], error: null };
  });
  const from = vi.fn(() => ({ list, remove }));
  return { client: { storage: { from } }, list, remove, files, from };
}

describe("wardrobe purge", () => {
  it("recurses through folders and includes orphan files", async () => {
    const f = fake([`${USER}/confirmed/original.jpg`, `${USER}/abandoned/cutout.webp`]);
    await expect(collectWardrobePaths(f.client, USER)).resolves.toEqual([`${USER}/abandoned/cutout.webp`, `${USER}/confirmed/original.jpg`]);
    expect(f.from).toHaveBeenCalledWith("wardrobe");
  });
  it("uses Storage entry ids, not path shape, to distinguish folders from files", async () => {
    const list = vi.fn(async (prefix: string) => {
      if (prefix === USER) {
        return { data: [{ name: "draft", id: null }, { name: "orphan.webp", id: "object-id" }], error: null };
      }
      if (prefix === `${USER}/draft`) {
        return { data: [{ name: "cutout.webp", id: "nested-object-id" }], error: null };
      }
      return { data: [], error: null };
    });
    const client = { storage: { from: () => ({ list, remove: vi.fn() }) } };

    await expect(collectWardrobePaths(client, USER)).resolves.toEqual([
      `${USER}/draft/cutout.webp`,
      `${USER}/orphan.webp`,
    ]);
    expect(list).toHaveBeenCalledTimes(2);
  });
  it("paginates in stable name order, collects before removing, and batches 2001 files", async () => {
    const paths = Array.from({ length: 2001 }, (_, i) => `${USER}/${String(i).padStart(4, "0")}.jpg`);
    const f = fake(paths);
    await purgeWardrobePrefix(f.client, USER);
    expect(f.list.mock.calls.slice(0, 3)).toEqual([0, 1000, 2000].map(offset => [USER, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } }]));
    expect(f.remove.mock.calls.map(([batch]) => batch.length)).toEqual([1000, 1000, 1]);
    expect(f.remove.mock.calls.flatMap(([batch]) => batch)).toEqual(paths);
    expect(f.files.size).toBe(0);
  });
  it("requests another page when the first page is exactly full", async () => {
    const f = fake(Array.from({ length: 1000 }, (_, i) => `${USER}/${i}.jpg`));
    await collectWardrobePaths(f.client, USER);
    expect(f.list).toHaveBeenCalledTimes(2);
  });
  it("empty prefixes and a repeated purge succeed without extra removal", async () => {
    const f = fake([`${USER}/draft/file.jpg`]);
    await purgeWardrobePrefix(f.client, USER);
    await purgeWardrobePrefix(f.client, USER);
    expect(f.remove).toHaveBeenCalledTimes(1);
    const empty = fake();
    await purgeWardrobePrefix(empty.client, USER);
    expect(empty.remove).not.toHaveBeenCalled();
  });
  it.each(["", "../other", "not-a-uuid", `${USER}/other`])("rejects unsafe user prefix %s", async (user) => {
    const f = fake();
    await expect(collectWardrobePaths(f.client, user)).rejects.toThrow("Invalid deletion user ID");
    await expect(purgeWardrobePrefix(f.client, user)).rejects.toThrow("Invalid deletion user ID");
    expect(f.from).not.toHaveBeenCalled();
  });
  it("sanitizes list failures", async () => {
    const f = fake();
    f.list.mockRejectedValueOnce(new Error(`${USER}/private.jpg`));
    await expect(collectWardrobePaths(f.client, USER)).rejects.toThrow(/^Wardrobe listing failed$/);
    f.list.mockResolvedValueOnce({ data: null, error: { message: "private" } } as never);
    await expect(collectWardrobePaths(f.client, USER)).rejects.toThrow(/^Wardrobe listing failed$/);
  });
  it("sanitizes removal failures", async () => {
    const f = fake([`${USER}/private.jpg`]);
    f.remove.mockResolvedValueOnce({ data: null, error: { message: "private" } } as never);
    await expect(purgeWardrobePrefix(f.client, USER)).rejects.toThrow(/^Wardrobe removal failed$/);
    f.remove.mockRejectedValueOnce(new Error("private"));
    await expect(purgeWardrobePrefix(f.client, USER)).rejects.toThrow(/^Wardrobe removal failed$/);
  });
  it("fails verification if removal leaves a nested file", async () => {
    const f = fake([`${USER}/draft/file.jpg`]);
    f.remove.mockImplementation(async () => ({ data: [], error: null }));
    await expect(purgeWardrobePrefix(f.client, USER)).rejects.toThrow(/^Wardrobe verification failed$/);
  });
});

describe("wardrobe owner listing", () => {
  const OTHER = "22222222-2222-4222-8222-222222222222";
  function rootClient(pages: Array<Array<{ name: string; id: string | null }>>, error: unknown = null) {
    const list = vi.fn(async (_prefix: string, options: { offset: number }) => ({
      data: error ? null : (pages[options.offset / 1000] ?? []),
      error,
    }));
    return { client: { storage: { from: () => ({ list, remove: vi.fn() }) } }, list };
  }

  it("returns every top-level UUID owner folder from the bucket root", async () => {
    const { client, list } = rootClient([[{ name: USER, id: null }, { name: OTHER, id: null }]]);
    await expect(listWardrobeOwnerIds(client)).resolves.toEqual([USER, OTHER]);
    expect(list).toHaveBeenCalledWith("", { limit: 1000, offset: 0, sortBy: { column: "name", order: "asc" } });
  });

  it("pages through a full root listing", async () => {
    const full = Array.from({ length: 1000 }, (_, i) => ({
      name: `${String(i).padStart(8, "0")}-1111-4111-8111-111111111111`,
      id: null,
    }));
    const { client, list } = rootClient([full, [{ name: OTHER, id: null }]]);
    await expect(listWardrobeOwnerIds(client)).resolves.toHaveLength(1001);
    expect(list).toHaveBeenCalledTimes(2);
  });

  it.each([
    [{ name: "not-a-user", id: null }],
    [{ name: "stray.jpg", id: "object-id" }],
    [{ name: USER, id: "object-id" }],
  ])("fails closed on an unexpected root entry %j", async (entry) => {
    const { client } = rootClient([[entry]]);
    await expect(listWardrobeOwnerIds(client)).rejects.toThrow("Wardrobe listing failed");
  });

  it("fails closed when the root listing errors", async () => {
    const { client } = rootClient([], { message: "provider detail" });
    await expect(listWardrobeOwnerIds(client)).rejects.toThrow("Wardrobe listing failed");
  });
});
