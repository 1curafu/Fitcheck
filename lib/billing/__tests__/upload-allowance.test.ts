import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: "user-1" } as { id: string } | null,
  tier: "free" as "free" | "pro",
  count: 49 as number | null,
  countError: null as Error | null,
  itemCountReads: 0,
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => ({
      select: () => ({
        eq: () => {
          if (table === "profiles") return { single: async () => ({ data: { tier: state.tier } }) };
          state.itemCountReads++;
          return Promise.resolve({ count: state.count, error: state.countError });
        },
      }),
    }),
  }),
}));

import { readUploadAllowance, assertCanUpload } from "../entitlements";
import { getUploadCapacity } from "@/app/closet/upload/actions";

beforeEach(() => {
  state.user = { id: "user-1" };
  state.tier = "free";
  state.count = 49;
  state.countError = null;
  state.itemCountReads = 0;
});

describe("upload allowance", () => {
  it("gives a free closet with 49 items one slot", async () => {
    expect(await readUploadAllowance()).toEqual({ allowed: true, remaining: 1 });
  });

  it("stops a free closet at 50 items", async () => {
    state.count = 50;
    expect(await readUploadAllowance()).toMatchObject({ allowed: false, remaining: 0 });
    await expect(assertCanUpload()).rejects.toThrow("A free closet holds 50 pieces");
  });

  it("does not count items for Pro", async () => {
    state.tier = "pro";
    expect(await readUploadAllowance()).toEqual({ allowed: true, remaining: null });
    expect(state.itemCountReads).toBe(0);
  });

  it("rejects a broken item count instead of granting a slot", async () => {
    state.count = null;
    state.countError = new Error("database unavailable");
    await expect(readUploadAllowance()).rejects.toThrow("Cannot check closet capacity");
    await expect(assertCanUpload()).rejects.toThrow("Cannot check closet capacity");
  });

  it("does not reveal capacity without an authenticated user", async () => {
    state.user = null;
    await expect(getUploadCapacity()).rejects.toThrow("Not authenticated");
    expect(state.itemCountReads).toBe(0);
  });
});
