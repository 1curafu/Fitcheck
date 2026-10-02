import { releaseSavedThenDelete } from "../release";

function client(error?: string) {
  const calls: unknown[][] = [];
  const rpc = (name: string, args: unknown) => {
    calls.push([name, args]);
    return Promise.resolve({ error: error ? { message: error } : null });
  };
  return { client: { rpc } as never, calls };
}

test("releases saved and deletes unsaved rows in ONE database call, so a concurrent save cannot land between them", async () => {
  const db = client();
  await releaseSavedThenDelete(db.client, ["old-1", "old-2"]);
  expect(db.calls).toEqual([["release_saved_then_delete", { p_ids: ["old-1", "old-2"] }]]);
});

test("a database error is surfaced", async () => {
  await expect(releaseSavedThenDelete(client("offline").client, ["old"])).rejects.toThrow("offline");
});

test("an empty set performs no call", async () => {
  const db = client();
  await releaseSavedThenDelete(db.client, []);
  expect(db.calls).toEqual([]);
});
