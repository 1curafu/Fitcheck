import { describe, expect, it } from "vitest";
import { encodeWithinBudget } from "../draw";

const blobOf = (size: number) => new Blob([new Uint8Array(size)], { type: "image/jpeg" });

describe("encodeWithinBudget", () => {
  it("returns the first quality that fits", async () => {
    const seen: number[] = [];
    const blob = await encodeWithinBudget(async (q) => { seen.push(q); return blobOf(q > 0.75 ? 400_000 : 250_000); }, 300_000);
    expect(blob.size).toBe(250_000);
    expect(seen).toEqual([0.9, 0.84, 0.78, 0.7]);
  });
  it("falls back to the smallest attempt when nothing fits", async () => {
    expect((await encodeWithinBudget(async (q) => blobOf(Math.round(q * 1_000_000)), 10)).size).toBe(620_000);
  });
});
