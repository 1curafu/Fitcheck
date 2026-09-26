import { describe, expect, it } from "vitest";
import { originalLocation } from "../original-path";

const owner = "11111111-1111-4111-8111-111111111111";

describe("originalLocation", () => {
  it("accepts the capture layout", () => {
    expect(originalLocation(owner, `${owner}/33333333-3333-4333-8333-333333333333/original.jpg`)).toEqual({
      folder: `${owner}/33333333-3333-4333-8333-333333333333`, file: "original.jpg",
    });
  });

  it("accepts a folder that is not the row id (pre-#112 rows, e2e seed)", () => {
    expect(originalLocation(owner, `${owner}/e2e-0/original.jpg`)).toEqual({ folder: `${owner}/e2e-0`, file: "original.jpg" });
  });

  it.each([
    ["another user's path", `22222222-2222-4222-8222-222222222222/f/original.jpg`],
    ["the cut-out", `${owner}/f/cutout.webp`],
    ["the thumbnail", `${owner}/f/thumb.webp`],
    ["a missing folder", `${owner}/original.jpg`],
    ["an extra segment", `${owner}/f/g/original.jpg`],
    ["an empty folder", `${owner}//original.jpg`],
    ["a dot folder", `${owner}/./original.jpg`],
    ["a parent folder", `${owner}/../original.jpg`],
    ["a four-segment path", `${owner}/f/original.jpg.bak/x`],
    ["a name with a second extension", `${owner}/f/original.jpg.bak`],
    ["no extension", `${owner}/f/original`],
  ])("rejects %s", (_label, path) => {
    expect(originalLocation(owner, path)).toBeNull();
  });
});
