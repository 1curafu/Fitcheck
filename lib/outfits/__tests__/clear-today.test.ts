import { clearTodaysDrop } from "../clear-today";

function clientWith(errors: { read?: string; rpc?: string } = {}) {
  const calls: unknown[][] = [];
  const client = {
  rpc: (name: string, args: unknown) => {
    calls.push(["rpc", name, args]);
    return Promise.resolve({ error: errors.rpc ? { message: errors.rpc } : null });
  },
  from: (table: string) => {
    let mode: "read" | "release" | "delete" = "read";
    const q = {
      select: () => q,
      eq: (key: string, value: unknown) => { calls.push(["eq", key, value]); return q; },
      is: (key: string, value: unknown) => { calls.push(["is", key, value]); return q; },
      not: (...args: unknown[]) => { calls.push(["not", ...args]); return q; },
      update: () => { mode = "release"; calls.push([table, mode]); return q; },
      delete: () => { mode = "delete"; calls.push([table, mode]); return q; },
      in: (key: string, ids: string[]) => { calls.push(["in", key, ids]); return q; },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({
        data: [{ id: "o1" }, { id: "o2" }], error: mode === "read" && errors.read ? { message: errors.read } : null,
      }).then(resolve),
    };
    return q;
  } };
  return { client: client as never, calls };
}

afterEach(() => vi.useRealTimers());

test("clears the given timezone's active looks, retaining saved pieces", async () => {
  const db = clientWith();
  vi.useFakeTimers().setSystemTime(new Date("2026-09-30T23:30:00Z"));
  await clearTodaysDrop(db.client, "u1", "Europe/Zurich");
  expect(db.calls).toEqual([
    ["eq", "user_id", "u1"], ["eq", "generated_on", "2026-10-01"], ["is", "released_at", null],
    ["rpc", "release_saved_then_delete", { p_ids: ["o1", "o2"] }],
  ]);
});

test.each(["read", "rpc"] as const)("a failed %s is surfaced rather than reporting a rebuild", async phase => {
  await expect(clearTodaysDrop(clientWith({ [phase]: phase }).client, "u1", "UTC")).rejects.toThrow(phase);
});
