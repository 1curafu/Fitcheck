import { describe, expect, it, vi } from "vitest";
import { purgeShareObjects } from "../shares";

const USER = "715ed5db-f090-4b8c-a067-640ecee36aa0";
function client(listings: (string[] | Error)[], removeError: Error | null = null) {
  const removed: string[][] = [];
  return {
    removed,
    rpc: vi.fn(async () => { const next = listings.shift() ?? []; return next instanceof Error ? { data: null, error: next } : { data: next, error: null }; }),
    storage: { from: () => ({ remove: vi.fn(async (paths: string[]) => { removed.push(paths); return { error: removeError }; }) }) },
  };
}

describe("purgeShareObjects", () => {
  it("removes every object the user uploaded, found by owner, then verifies", async () => {
    const c = client([["T1/story.jpg", "T1/og.jpg"], []]);
    await purgeShareObjects(c as never, USER);
    expect(c.rpc).toHaveBeenCalledWith("share_object_names", { p_user: USER });
    expect(c.removed).toEqual([["T1/story.jpg", "T1/og.jpg"]]);
  });
  it("fails closed on each step", async () => {
    await expect(purgeShareObjects(client([new Error("x")]) as never, USER)).rejects.toThrow("Shares listing failed");
    await expect(purgeShareObjects(client([["a/b.jpg"]], new Error("x")) as never, USER)).rejects.toThrow("Shares removal failed");
    await expect(purgeShareObjects(client([["a/b.jpg"], ["a/b.jpg"]]) as never, USER)).rejects.toThrow("Shares verification failed");
    await expect(purgeShareObjects(client([]) as never, "nope")).rejects.toThrow("Invalid deletion user ID");
  });
});
