import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE_FAILED, DELETE_NOT_REMOVED } from "@/lib/closet/erase-copy";

const owner = "11111111-1111-4111-8111-111111111111";
const itemId = "33333333-3333-4333-8333-333333333333";
const folder = `${owner}/9f0c1c7e-0000-4000-8000-000000000000`; // folder id ≠ row id, as before #112

type Listing = { data: { name: string }[] | null; error: Error | null };
type Row = { id: string; image_url: string | null; cutout_url: string | null; thumb_url: string | null; archived: boolean | null };

const state = vi.hoisted(() => ({
  user: { id: "11111111-1111-4111-8111-111111111111" } as { id: string } | null,
  row: null as Row | null,
  others: [] as { id: string }[],
  othersError: null as null | Error,
  lists: [] as Listing[],
  removeError: null as null | Error,
  deleteError: null as null | Error,
  calls: [] as string[],
  redirect: vi.fn((to: string) => { throw new Error(`REDIRECT ${to}`); }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: state.redirect }));
vi.mock("@/lib/billing/entitlements", () => ({ assertCanUpload: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    storage: { from: () => ({
      remove: async (paths: string[]) => { state.calls.push(`remove:${[...paths].sort().join(",")}`); return { data: [], error: state.removeError }; },
      list: async (f: string) => { state.calls.push(`list:${f}`); return state.lists.shift() ?? { data: [], error: null }; },
    }) },
    from: () => ({
      select: () => {
        const q = {
          eq: () => ({ maybeSingle: async () => ({ data: state.row, error: null }) }),
          neq: () => q,
          or: (filter: string) => { state.calls.push(`others:${filter}`); return q; },
          limit: async () => ({ data: state.others, error: state.othersError }),
        };
        return q;
      },
      delete: () => ({ eq: async (_c: string, id: string) => { state.calls.push(`delete:${id}`); return { error: state.deleteError }; } }),
    }),
  }),
}));

import { deletePiece } from "../actions";

const files = (...names: string[]): Listing => ({ data: names.map((name) => ({ name })), error: null });

beforeEach(() => {
  state.user = { id: owner };
  state.row = { id: itemId, image_url: `${folder}/original.jpg`, cutout_url: `${folder}/cutout.webp`, thumb_url: `${folder}/thumb.webp`, archived: true };
  state.others = []; state.othersError = null;
  state.lists = [files("original.jpg", "cutout.webp", "thumb.webp", "cutout-old.webp"), files()];
  state.removeError = null; state.deleteError = null;
  state.calls = [];
  state.redirect.mockClear();
});

describe("deletePiece", () => {
  it("refuses without a session, with a bad id, or for a row RLS does not return", async () => {
    state.user = null;
    await expect(deletePiece(itemId)).rejects.toThrow("Not authenticated");
    state.user = { id: owner };
    await expect(deletePiece("../x")).rejects.toThrow("Not found");
    state.row = null;
    await expect(deletePiece(itemId)).rejects.toThrow("Not found");
    expect(state.calls).toEqual([]);
  });

  it("only deletes a piece that is already removed, with zero writes otherwise", async () => {
    state.row = { ...state.row!, archived: false };
    expect(await deletePiece(itemId)).toEqual({ status: "unavailable", message: DELETE_NOT_REMOVED });
    expect(state.calls).toEqual([]);
  });

  it("refuses a stored path outside the caller's folder before touching Storage", async () => {
    state.row = { ...state.row!, cutout_url: `22222222-2222-4222-8222-222222222222/x/cutout.webp` };
    await expect(deletePiece(itemId)).rejects.toThrow("Not your upload");
    expect(state.calls).toEqual([]);
  });

  it("empties the piece's whole folder, verifies it, THEN deletes the row and lands on Removed pieces", async () => {
    await expect(deletePiece(itemId)).rejects.toThrow("REDIRECT /closet/removed");
    expect(state.calls).toEqual([
      `others:image_url.like.${folder}/*,cutout_url.like.${folder}/*,thumb_url.like.${folder}/*`,
      `list:${folder}`,
      `remove:${["cutout-old.webp", "cutout.webp", "original.jpg", "thumb.webp"].map((f) => `${folder}/${f}`).sort().join(",")}`,
      `list:${folder}`,
      `delete:${itemId}`,
    ]);
  });

  it("deletes a piece whose original was already erased", async () => {
    state.row = { ...state.row!, image_url: null };
    state.lists = [files("cutout.webp", "thumb.webp"), files()];
    await expect(deletePiece(itemId)).rejects.toThrow("REDIRECT /closet/removed");
    expect(state.calls.at(-1)).toBe(`delete:${itemId}`);
  });

  it("removes only this piece's own files when another piece shares the folder", async () => {
    state.others = [{ id: "44444444-4444-4444-8444-444444444444" }];
    state.lists = [files("original.jpg", "cutout.webp", "thumb.webp", "other-cutout.webp"), files("other-cutout.webp")];
    await expect(deletePiece(itemId)).rejects.toThrow("REDIRECT /closet/removed");
    expect(state.calls).toContain(`remove:${[`${folder}/cutout.webp`, `${folder}/original.jpg`, `${folder}/thumb.webp`].sort().join(",")}`);
  });

  it.each([
    ["the sharing check fails", () => { state.othersError = new Error("x"); }],
    ["the folder cannot be listed", () => { state.lists = [{ data: null, error: new Error("x") }]; }],
    ["Storage refuses the removal", () => { state.removeError = new Error("x"); }],
    ["a file is still listed afterwards", () => { state.lists = [files("original.jpg"), files("original.jpg")]; }],
    ["verification cannot list", () => { state.lists = [files("original.jpg"), { data: null, error: new Error("x") }]; }],
  ])("keeps the row when %s", async (_, arrange) => {
    arrange();
    expect(await deletePiece(itemId)).toEqual({ status: "error", message: DELETE_FAILED });
    expect(state.calls.some((c) => c.startsWith("delete:"))).toBe(false);
  });
});
