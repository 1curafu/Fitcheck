import { releaseSavedThenDelete } from "../release";

function client(errors: { release?: string; delete?: string } = {}) {
  const calls: unknown[][] = [];
  const from = (table: string) => {
    let mode = "release";
    const q = {
      update(values: unknown) { calls.push([table, "update", values]); return q; },
      delete() { mode = "delete"; calls.push([table, "delete"]); return q; },
      in(key: string, ids: string[]) { calls.push(["in", key, ids]); return q; },
      not(...args: unknown[]) { calls.push(["not", ...args]); return q; },
      is(...args: unknown[]) { calls.push(["is", ...args]); return q; },
      then(resolve: (value: unknown) => unknown) {
        const message = errors[mode as keyof typeof errors];
        return Promise.resolve({ error: message ? { message } : null }).then(resolve);
      },
    };
    return q;
  };
  return { client: { from } as never, calls };
}

test("releases saved rows before deleting only unsaved rows, scoped to the supplied ids", async () => {
  const db = client();
  await releaseSavedThenDelete(db.client, ["old"]);
  expect(db.calls).toEqual([
    ["outfits", "update", { released_at: expect.any(String), look_index: null, styled_index: null }],
    ["in", "id", ["old"]], ["not", "saved_at", "is", null],
    ["outfits", "delete"], ["in", "id", ["old"]], ["is", "saved_at", null],
  ]);
});

test("a failed release stops before deleting anything", async () => {
  const db = client({ release: "offline" });
  await expect(releaseSavedThenDelete(db.client, ["old"])).rejects.toThrow("offline");
  expect(db.calls.some(call => call[1] === "delete")).toBe(false);
});

test("a delete error is surfaced", async () => {
  await expect(releaseSavedThenDelete(client({ delete: "offline" }).client, ["old"])).rejects.toThrow("offline");
});

test("an empty set performs no writes", async () => {
  const db = client();
  await releaseSavedThenDelete(db.client, []);
  expect(db.calls).toEqual([]);
});
