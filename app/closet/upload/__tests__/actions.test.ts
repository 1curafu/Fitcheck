import { beforeEach, describe, expect, it, vi } from "vitest";
import { UploadLimitError } from "@/lib/billing/errors";

const state = vi.hoisted(() => ({
  writes: [] as string[],
  removals: [] as string[][],
  failSuffix: null as string | null,
  gate: vi.fn<() => Promise<void>>(),
  tag: vi.fn<() => Promise<{ tags: object; rotation: 0 }>>(),
  row: null as null | { id: string; user_id: string; image_url: string; cutout_url: string },
  inserted: [] as Record<string, unknown>[],
  insertError: null as null | { code: string; message: string },
  itemReads: 0,
  raceWinner: null as null | { id: string; user_id: string; image_url: string; cutout_url: string },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/billing/entitlements", () => ({
  assertCanUpload: state.gate,
  readUploadAllowance: vi.fn(),
}));
vi.mock("@/lib/ai/tag-item", () => ({ tagItem: state.tag }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "11111111-1111-4111-8111-111111111111" } } }) },
    storage: { from: () => ({
      upload: async (path: string) => {
        state.writes.push(path);
        return { data: null, error: state.failSuffix && path.endsWith(state.failSuffix)
          ? new Error(`Failed ${state.failSuffix}`) : null };
      },
      remove: async (paths: string[]) => { state.removals.push(paths); return { data: [], error: null }; },
    }) },
    from: (table: string) => {
      if (table !== "items") throw new Error(`Unexpected table ${table}`);
      return {
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => {
          state.itemReads++;
          return { data: state.raceWinner && state.itemReads > 1 ? state.raceWinner : state.row, error: null };
        } }), maybeSingle: async () => {
          state.itemReads++;
          return { data: state.raceWinner && state.itemReads > 1 ? state.raceWinner : state.row, error: null };
        } }) }),
        insert: async (row: Record<string, unknown>) => {
          state.inserted.push(row);
          if (!state.insertError) state.row = {
            id: String(row.id), user_id: String(row.user_id),
            image_url: String(row.image_url), cutout_url: String(row.cutout_url),
          };
          return { error: state.insertError };
        },
      };
    },
  }),
}));

import { confirmItem, discardDraft, uploadAndTag } from "../actions";

const owner = "11111111-1111-4111-8111-111111111111";
const itemId = "33333333-3333-4333-8333-333333333333";
const base = `${owner}/${itemId}`;
const tags = {
  category: "Tops", subcategory: "Ribbed knit", colors: ["navy"], pattern: "solid",
  material: "Merino wool", texture: "Ribbed", formality: 3,
  seasons: ["Autumn", "Winter"], accent_color: null, branding: null,
  fit: null, fit_source: null, length: null, bulk: null, distressing: null,
};
const confirmation = {
  itemId, imagePath: `${base}/original.jpg`, cutoutPath: `${base}/cutout.webp`,
  thumbPath: `${base}/thumb.webp`, tags,
};

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
  state.row = null;
  state.inserted = [];
  state.insertError = null;
  state.itemReads = 0;
  state.raceWinner = null;
  state.gate.mockReset().mockResolvedValue();
  state.tag.mockReset().mockResolvedValue({ tags: { category: "Tops" }, rotation: 0 });
});

describe("confirmation", () => {
  it("saves with the draft id and returns a saved result", async () => {
    expect(await confirmItem(confirmation)).toEqual({ status: "saved" });
    expect(state.inserted).toHaveLength(1);
    expect(state.inserted[0]).toMatchObject({ id: itemId, user_id: owner, image_url: confirmation.imagePath });
  });

  it("accepts a matching saved row before quota or rotation writes", async () => {
    state.row = { id: itemId, user_id: owner, image_url: confirmation.imagePath,
      cutout_url: confirmation.cutoutPath };
    state.gate.mockRejectedValueOnce(new UploadLimitError("closet full"));
    expect(await confirmItem({ ...confirmation, rotated: {
      cutoutB64: "Y3V0", mediaType: "image/webp", thumbB64: null, thumbMediaType: null,
    } })).toEqual({ status: "saved" });
    expect(state.writes).toHaveLength(0);
    expect(state.inserted).toHaveLength(0);
  });

  it("rejects a saved row that belongs to another draft", async () => {
    state.row = { id: itemId, user_id: owner, image_url: `${base}/other.jpg`,
      cutout_url: confirmation.cutoutPath };
    await expect(confirmItem(confirmation)).rejects.toThrow("Not your upload");
    expect(state.inserted).toHaveLength(0);
  });

  it("recognizes a concurrent insert by its duplicate key", async () => {
    state.insertError = { code: "23505", message: "duplicate" };
    // The first read sees no row. The post-conflict read sees the winner.
    const winner = { id: itemId, user_id: owner, image_url: confirmation.imagePath,
      cutout_url: confirmation.cutoutPath };
    state.raceWinner = winner;
    expect(await confirmItem(confirmation)).toEqual({ status: "saved" });
  });

  it("keeps the draft when capacity is filled before confirmation", async () => {
    state.gate.mockRejectedValueOnce(new UploadLimitError("closet full"));
    expect(await confirmItem(confirmation)).toEqual({ status: "limited", message: "closet full" });
    expect(state.inserted).toHaveLength(0);
    expect(state.removals).toHaveLength(0);
  });

  it("does not delete image paths of a saved item", async () => {
    state.row = { id: itemId, user_id: owner, image_url: confirmation.imagePath,
      cutout_url: confirmation.cutoutPath };
    await discardDraft([confirmation.imagePath, confirmation.cutoutPath]);
    expect(state.removals).toHaveLength(0);
  });
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
