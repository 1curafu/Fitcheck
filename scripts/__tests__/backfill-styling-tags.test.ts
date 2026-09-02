import { vi, test, expect, beforeEach } from "vitest";

// The script talks to two boundaries: Supabase (service-role, storage +
// table) and the Haiku tagger. Both are mocked here so the suite never
// touches the network or spends a real cent — the real spend happens once,
// deliberately, in Step 5 against the local stack.

let lastWrite: Record<string, unknown> | undefined;
const tagItemMock = vi.fn(async (_cutoutBase64: string, _mediaType: string) => ({
  category: "Tops",
  subcategory: "T-shirt",
  colors: ["black"],
  pattern: "solid",
  material: "Cotton",
  texture: "Flat",
  formality: 2,
  seasons: ["Summer"],
  accent_color: "rust",
  branding: "Small",
  // The model still drafts a guess for `fit` on the normal capture path —
  // the backfill's whole job is to throw this one away before it is written.
  fit: "Regular",
  length: "Hip",
  bulk: "Regular",
  distressing: "None",
}));

vi.mock("@/lib/ai/tag-item", () => ({
  tagItem: (cutoutBase64: string, mediaType: string) => tagItemMock(cutoutBase64, mediaType),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        download: async (path: string) => {
          if (path === "explodes") throw new Error("storage exploded");
          return { data: { arrayBuffer: async () => new ArrayBuffer(4) }, error: null };
        },
      }),
    },
    from: () => ({
      update: (payload: Record<string, unknown>) => {
        lastWrite = payload;
        return { eq: async () => ({ error: null }) };
      },
    }),
  }),
}));

import { backfillItem } from "../backfill-styling-tags";

async function captureWrite(fn: () => Promise<unknown>) {
  lastWrite = undefined;
  await fn();
  return lastWrite;
}

beforeEach(() => {
  tagItemMock.mockClear();
  lastWrite = undefined;
});

// The sentinel is `branding`/`distressing`, not `accent_color`: accent_color
// is legitimately null on a processed row (most garments have no accent), so
// it can't distinguish "never touched" from "touched, nothing to report".
// branding/distressing always come back populated (their enums include a
// literal "None") once a row has been through the tagger.
test("an item that already has branding/distressing set is skipped, not re-billed", async () => {
  const r = await backfillItem({ id: "1", branding: "None", distressing: "None", cutout_url: "x" });
  expect(r).toBe("skipped");
  expect(tagItemMock).not.toHaveBeenCalled();
});

test("fit is never written by the backfill", async () => {
  const written = await captureWrite(() =>
    backfillItem({ id: "2", branding: null, distressing: null, cutout_url: "x" }),
  );
  expect(written).not.toHaveProperty("fit");
});

test("an item with no cutout is skipped rather than failing the whole run", async () => {
  expect(await backfillItem({ id: "3", branding: null, distressing: null, cutout_url: null })).toBe("skipped");
});

test("one failed item does not abort the run", async () => {
  expect(
    await backfillItem({ id: "4", branding: null, distressing: null, cutout_url: "explodes" }),
  ).toBe("failed");
});
