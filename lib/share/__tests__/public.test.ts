import { beforeEach, expect, test, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }) }));
import { readSharedLook } from "../public";

beforeEach(() => rpc.mockReset());

test("returns a validated snapshot, and nothing for a malformed token without querying", async () => {
  rpc.mockResolvedValue({ data: [{ look_name: "Quiet Camel", reasoning: "Why.", occasion: "everyday",
    pieces: [{ n: 1, name: "Camel overcoat", category: "Outerwear", brand: null }], show_brands: false,
    ready_at: "2026-09-26T10:00:00Z", updated_at: "2026-09-26T10:00:00Z" }], error: null });
  expect(await readSharedLook("AAAAAAAAAAAAAAAAAAAAAA")).toMatchObject({ lookName: "Quiet Camel", pieces: [{ n: 1 }] });
  expect(await readSharedLook("nope")).toBeNull();
  expect(rpc).toHaveBeenCalledTimes(1);
});

test("malformed pieces written directly to the table do not crash the page", async () => {
  rpc.mockResolvedValue({ data: [{ look_name: "x", reasoning: null, occasion: null, pieces: [{ bad: true }], show_brands: false,
    ready_at: "2026-09-26T10:00:00Z", updated_at: "2026-09-26T10:00:00Z" }], error: null });
  expect(await readSharedLook("BBBBBBBBBBBBBBBBBBBBBB")).toBeNull();
});
