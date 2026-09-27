import { beforeEach, describe, expect, it, vi } from "vitest";
import { UploadLimitError } from "@/lib/billing/errors";
import messages from "@/messages/en-US.json";

const owner = "11111111-1111-4111-8111-111111111111";
const itemId = "33333333-3333-4333-8333-333333333333";

type Listing = { data: { name: string }[] | null; error: Error | null };

const state = vi.hoisted(() => ({
  user: { id: "11111111-1111-4111-8111-111111111111" } as { id: string } | null,
  row: null as null | { id: string; image_url: string | null; cutout_url: string | null; archived: boolean | null },
  calls: [] as string[],
  removeError: null as null | Error,
  // Each list() call takes the next listing: [0] = before the remove (cut-out must be there), [1] = after it.
  lists: [] as Listing[],
  updates: [] as Record<string, unknown>[],
  updateError: null as null | Error,
  gate: vi.fn<() => Promise<void>>(),
  redirect: vi.fn((to: string) => { throw new Error(`REDIRECT ${to}`); }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: state.redirect }));
vi.mock("@/lib/billing/entitlements", () => ({ assertCanUpload: state.gate }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    storage: { from: () => ({
      remove: async (paths: string[]) => { state.calls.push(`remove:${paths.join(",")}`); return { data: [], error: state.removeError }; },
      list: async (folder: string) => { state.calls.push(`list:${folder}`); return state.lists.shift() ?? { data: [], error: null }; },
    }) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.row, error: null }) }) }),
      update: (payload: Record<string, unknown>) => ({ eq: async () => {
        state.calls.push("update"); state.updates.push(payload); return { error: state.updateError };
      } }),
    }),
  }),
}));

import { eraseOriginal, restoreItem } from "../actions";

const legacy = `${owner}/9f0c1c7e-0000-4000-8000-000000000000`; // folder id ≠ row id, as before #112
const files = (...names: string[]): Listing => ({ data: names.map((name) => ({ name })), error: null });

beforeEach(() => {
  state.user = { id: owner };
  state.row = { id: itemId, image_url: `${legacy}/original.jpg`, cutout_url: `${legacy}/cutout.webp`, archived: false };
  state.calls = []; state.updates = [];
  state.removeError = null; state.updateError = null;
  state.lists = [files("original.jpg", "cutout.webp", "thumb.webp"), files("cutout.webp", "thumb.webp")];
  state.gate.mockReset().mockResolvedValue();
  state.redirect.mockClear();
});

describe("eraseOriginal", () => {
  it("refuses without a session", async () => {
    state.user = null;
    await expect(eraseOriginal(itemId)).rejects.toThrow("Not authenticated");
    expect(state.calls).toEqual([]);
  });

  it("refuses an id that is not a uuid", async () => {
    await expect(eraseOriginal("../x")).rejects.toThrow("Not found");
    expect(state.calls).toEqual([]);
  });

  it("refuses a missing or foreign row (RLS returns nothing)", async () => {
    state.row = null;
    await expect(eraseOriginal(itemId)).rejects.toThrow("Not found");
    expect(state.calls).toEqual([]);
  });

  it("is unavailable for a piece without a cut-out, with zero writes", async () => {
    state.row = { ...state.row!, cutout_url: null };
    expect(await eraseOriginal(itemId)).toEqual({ status: "unavailable", message: "errors.eraseNoCutout" });
    expect(state.calls).toEqual([]);
  });

  it("leaves an already-erased piece alone, even if it was put back since", async () => {
    state.row = { ...state.row!, image_url: null, archived: false };
    expect(await eraseOriginal(itemId)).toEqual({ status: "unavailable", message: "errors.eraseAlready" });
    expect(state.calls).toEqual([]);
  });

  it("refuses a stored path outside the caller's folder", async () => {
    state.row = { ...state.row!, image_url: `22222222-2222-4222-8222-222222222222/f/original.jpg` };
    await expect(eraseOriginal(itemId)).rejects.toThrow("Not your upload");
    expect(state.calls).toEqual([]);
  });

  it("is unavailable when the cut-out lives in a different folder", async () => {
    state.row = { ...state.row!, cutout_url: `${owner}/other/cutout.webp` };
    expect(await eraseOriginal(itemId)).toEqual({ status: "unavailable", message: "errors.eraseNoCutout" });
    expect(state.calls).toEqual([]);
  });

  it("is unavailable when the cut-out object is missing from Storage (pre-aa27095 rows), removing nothing", async () => {
    state.lists = [files("original.jpg", "thumb.webp")];
    expect(await eraseOriginal(itemId)).toEqual({ status: "unavailable", message: "errors.eraseNoCutout" });
    expect(state.calls).toEqual([`list:${legacy}`]);
  });

  it("does nothing when the pre-check cannot list", async () => {
    state.lists = [{ data: null, error: new Error("list failed") }];
    expect(await eraseOriginal(itemId)).toEqual({ status: "error", message: "errors.eraseFailed" });
    expect(state.calls).toEqual([`list:${legacy}`]);
  });

  it("erases a legacy piece: check the cut-out, remove, verify in ITS folder, then the row", async () => {
    await expect(eraseOriginal(itemId)).rejects.toThrow("REDIRECT /closet");
    expect(state.calls).toEqual([`list:${legacy}`, `remove:${legacy}/original.jpg`, `list:${legacy}`, "update"]);
    expect(state.updates).toEqual([{ image_url: null, archived: true }]);
  });

  it("leaves the row untouched when Storage fails", async () => {
    state.removeError = new Error("storage down");
    expect(await eraseOriginal(itemId)).toEqual({ status: "error", message: "errors.eraseFailed" });
    expect(state.updates).toEqual([]);
  });

  it("leaves the row untouched when the file is still listed afterwards", async () => {
    state.lists = [files("original.jpg", "cutout.webp"), files("original.jpg", "cutout.webp")];
    expect(await eraseOriginal(itemId)).toEqual({ status: "error", message: "errors.eraseFailed" });
    expect(state.updates).toEqual([]);
  });

  it("leaves the row untouched when verification cannot list", async () => {
    state.lists = [files("original.jpg", "cutout.webp"), { data: null, error: new Error("list failed") }];
    expect(await eraseOriginal(itemId)).toEqual({ status: "error", message: "errors.eraseFailed" });
    expect(state.updates).toEqual([]);
  });

  it("completes a retry after the row update failed once (file already gone)", async () => {
    state.updateError = new Error("db blip");
    await expect(eraseOriginal(itemId)).rejects.toThrow("db blip");

    // Second attempt: the original is already gone from Storage; remove() of a missing object returns no error.
    state.updateError = null;
    state.lists = [files("cutout.webp", "thumb.webp"), files("cutout.webp", "thumb.webp")];
    await expect(eraseOriginal(itemId)).rejects.toThrow("REDIRECT /closet");
    expect(state.updates).toEqual([
      { image_url: null, archived: true },
      { image_url: null, archived: true },
    ]);
  });
});

describe("erase copy", () => {
  it("tells a user whose piece cannot be erased how else to get the photo deleted", () => {
    expect(messages.errors.eraseNoCutout).toMatch(/legal@fitcheck\.space/);
  });
});

describe("restoreItem", () => {
  it("puts a removed piece back after the capacity gate", async () => {
    state.row = { ...state.row!, archived: true };
    expect(await restoreItem(itemId)).toEqual({ status: "restored" });
    expect(state.gate).toHaveBeenCalledOnce();
    expect(state.updates).toEqual([{ archived: false }]);
  });

  it("reports the limit and changes nothing when the closet is full", async () => {
    state.row = { ...state.row!, archived: true };
    state.gate.mockRejectedValueOnce(new UploadLimitError("Free closets hold 50 pieces"));
    expect(await restoreItem(itemId)).toEqual({ status: "limited", message: "errors.closetFull", values: { limit: 50 } });
    expect(state.updates).toEqual([]);
  });

  it("does not gate or write for a piece already in the closet", async () => {
    expect(await restoreItem(itemId)).toEqual({ status: "restored" });
    expect(state.gate).not.toHaveBeenCalled();
    expect(state.updates).toEqual([]);
  });

  it("refuses without a session or with a bad id", async () => {
    await expect(restoreItem("nope")).rejects.toThrow("Not found");
    state.user = null;
    await expect(restoreItem(itemId)).rejects.toThrow("Not authenticated");
  });
});
