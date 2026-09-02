import { vi, test, expect, beforeEach } from "vitest";
import type { Tags } from "@/lib/ai/tagging-schema";

// The script talks to two boundaries: Supabase (service-role, storage +
// table) and the Haiku tagger. Both are mocked here so the suite never
// touches the network or spends a real cent — the real spend happens once,
// deliberately, in Step 5 against the local stack.

let lastWrite: Record<string, unknown> | undefined;
const tagItemMock = vi.fn(async (_cutoutBase64: string, _mediaType: string): Promise<Tags> => ({
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
        return {
          // Item "6" simulates tagItem succeeding (billed) but the DB write
          // failing afterward — exactly the case onBilled exists for.
          eq: async (_col: string, id: string) => ({ error: id === "6" ? new Error("write failed") : null }),
        };
      },
    }),
  }),
}));

import { backfillItem } from "../backfill-styling-tags";

async function captureWrite(fn: () => Promise<unknown>): Promise<Record<string, unknown> | undefined> {
  lastWrite = undefined;
  await fn();
  return lastWrite;
}

beforeEach(() => {
  tagItemMock.mockClear();
  lastWrite = undefined;
});

// The sentinel is `distressing` alone, not `accent_color` and not `branding`.
// `accent_color` is legitimately null on a processed row (most garments have
// no accent), so it can't distinguish "never touched" from "touched, nothing
// to report". `branding` is `.nullable()` in TagSchema and the model really
// does return null for it sometimes, so it isn't safe either. `distressing`
// is the one column the script itself coerces to a non-null value on every
// write (see the next test), so "still NULL" reliably means "never processed".
test("an item that already has distressing set is skipped, not re-billed", async () => {
  const r = await backfillItem({ id: "1", distressing: "None", cutout_url: "x" });
  expect(r).toBe("skipped");
  expect(tagItemMock).not.toHaveBeenCalled();
});

test("distressing is always written non-null, so the sentinel cannot fail", async () => {
  // The model may legitimately return null here; the sentinel may not.
  tagItemMock.mockResolvedValueOnce({
    category: "Tops",
    subcategory: "T-shirt",
    colors: ["black"],
    pattern: "solid",
    material: "Cotton",
    texture: "Flat",
    formality: 2,
    seasons: ["Summer"],
    accent_color: null,
    branding: null,
    fit: null,
    length: null,
    bulk: null,
    distressing: null,
  });
  const written = await captureWrite(() => backfillItem({ id: "5", cutout_url: "ok" }));
  expect(written?.distressing).not.toBeNull();
  expect(written?.distressing).toBe("None");
});

test("fit is never written by the backfill", async () => {
  const written = await captureWrite(() => backfillItem({ id: "2", distressing: null, cutout_url: "x" }));
  expect(written).not.toHaveProperty("fit");
});

test("an item with no cutout is skipped rather than failing the whole run", async () => {
  expect(await backfillItem({ id: "3", distressing: null, cutout_url: null })).toBe("skipped");
});

test("one failed item does not abort the run", async () => {
  expect(await backfillItem({ id: "4", distressing: null, cutout_url: "explodes" })).toBe("failed");
});

test("onBilled fires when tagItem succeeds, even if the write afterward fails", async () => {
  let billed = 0;
  const r = await backfillItem({ id: "6", distressing: null, cutout_url: "write-fails" }, () => billed++);
  expect(billed).toBe(1);
  expect(r).toBe("failed");
});
