import { beforeEach, describe, expect, it, vi } from "vitest";
import { UploadLimitError } from "@/lib/billing/errors";

const state = vi.hoisted(() => ({
  writes: [] as string[],
  removals: [] as string[][],
  failSuffix: null as string | null,
  gate: vi.fn<() => Promise<void>>(),
  tag: vi.fn<() => Promise<{ tags: object; rotation: 0 }>>(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/billing/entitlements", () => ({
  assertCanUpload: state.gate,
  readUploadAllowance: vi.fn(),
}));
vi.mock("@/lib/ai/tag-item", () => ({ tagItem: state.tag }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) },
    storage: { from: () => ({
      upload: async (path: string) => {
        state.writes.push(path);
        return { data: null, error: state.failSuffix && path.endsWith(state.failSuffix)
          ? new Error(`Failed ${state.failSuffix}`) : null };
      },
      remove: async (paths: string[]) => { state.removals.push(paths); return { data: [], error: null }; },
    }) },
  }),
}));

import { uploadAndTag } from "../actions";

const form = {
  originalB64: "b3JpZw==",
  cutoutB64: "Y3V0",
  mediaType: "image/webp" as const,
  thumbB64: "dGh1bWI=",
  thumbMediaType: "image/webp" as const,
};

beforeEach(() => {
  state.writes = [];
  state.removals = [];
  state.failSuffix = null;
  state.gate.mockReset().mockResolvedValue();
  state.tag.mockReset().mockResolvedValue({ tags: { category: "Tops" }, rotation: 0 });
});

describe("draft upload", () => {
  it("does not tag when the original fails to store", async () => {
    state.failSuffix = "original.jpg";
    await expect(uploadAndTag(form)).rejects.toThrow("Failed original.jpg");
    expect(state.writes).toHaveLength(1);
    expect(state.tag).not.toHaveBeenCalled();
  });

  it("removes the original when cutout storage fails", async () => {
    state.failSuffix = "cutout.webp";
    await expect(uploadAndTag(form)).rejects.toThrow("Failed cutout.webp");
    expect(state.writes).toHaveLength(2);
    expect(state.removals.flat()).toContain(state.writes[0]);
    expect(state.tag).not.toHaveBeenCalled();
  });

  it("removes uploaded blobs if tagging fails", async () => {
    state.tag.mockRejectedValueOnce(new Error("tagging unavailable"));
    await expect(uploadAndTag(form)).rejects.toThrow("tagging unavailable");
    expect(state.writes).toHaveLength(3);
    expect(state.removals.flat()).toEqual(expect.arrayContaining(state.writes));
  });

  it("continues without a thumbnail when its write fails", async () => {
    state.failSuffix = "thumb.webp";
    const result = await uploadAndTag(form);
    expect(result).toMatchObject({ status: "ready", thumbPath: null });
    expect(state.tag).toHaveBeenCalledOnce();
  });

  it("reports an upload limit before storage or tagging", async () => {
    state.gate.mockRejectedValueOnce(new UploadLimitError("closet full"));
    expect(await uploadAndTag(form)).toEqual({ status: "limited", message: "closet full" });
    expect(state.writes).toHaveLength(0);
    expect(state.tag).not.toHaveBeenCalled();
  });
});
