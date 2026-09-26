import { describe, expect, it } from "vitest";
import { assertDraftIdentity, groupOwnedDraftPaths } from "../capture-paths";

const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const itemId = "33333333-3333-4333-8333-333333333333";
const anotherItem = "44444444-4444-4444-8444-444444444444";
const base = `${owner}/${itemId}`;

const draft = {
  itemId,
  imagePath: `${base}/original.jpg`,
  cutoutPath: `${base}/cutout.webp`,
  thumbPath: `${base}/thumb.webp`,
};

describe("draft path ownership", () => {
  it("accepts exact owned draft paths", () => {
    expect(assertDraftIdentity(owner, draft)).toBe(base);
    expect(assertDraftIdentity(owner, { ...draft, cutoutPath: `${base}/cutout.png`, thumbPath: null })).toBe(base);
  });

  it.each([
    ["other user", { cutoutPath: `${other}/${itemId}/cutout.webp` }],
    ["other item", { cutoutPath: `${owner}/${anotherItem}/cutout.webp` }],
    ["lookalike user", { cutoutPath: `${owner}bad/${itemId}/cutout.webp` }],
    ["non-UUID item", { itemId: "item" }],
    ["path traversal", { thumbPath: `${base}/../thumb.webp` }],
    ["wrong filename", { imagePath: `${base}/stolen.jpg` }],
  ])("rejects %s", (_, change) => {
    expect(() => assertDraftIdentity(owner, { ...draft, ...change })).toThrow("Not your upload");
  });

  it("groups only exact owned draft files for cleanup", () => {
    const grouped = groupOwnedDraftPaths(owner, [
      draft.imagePath, draft.cutoutPath, `${other}/${itemId}/original.jpg`,
      `${base}/../original.jpg`, `${owner}/${anotherItem}/thumb.png`,
    ]);
    expect([...grouped]).toEqual([
      [itemId, [draft.imagePath, draft.cutoutPath]],
      [anotherItem, [`${owner}/${anotherItem}/thumb.png`]],
    ]);
  });
});
