import { displayPath } from "../signed";

/**
 * ⚠️ **The fallback chain, pinned.** All three rungs are live in the real data:
 * rows uploaded before the thumbnail existed have no `thumb_url`, and a row
 * whose background removal failed has no `cutout_url` either. Breaking a rung
 * shows up as a blank tile, and `page.goto` then hangs until timeout waiting
 * for a `load` that never fires — a failure that reads like a missing element.
 */
const full = { thumb_url: "u/i/thumb.webp", cutout_url: "u/i/cutout.webp", image_url: "u/i/original.jpg" };

test("full is the default, so every existing caller is unchanged", () => {
  expect(displayPath(full)).toBe("u/i/cutout.webp");
});

test("full never returns the thumbnail, even when one exists", () => {
  expect(displayPath(full, "full")).toBe("u/i/cutout.webp");
});

test("thumb prefers the thumbnail", () => {
  expect(displayPath(full, "thumb")).toBe("u/i/thumb.webp");
});

test("thumb falls through to the cutout for a row uploaded before thumbnails", () => {
  expect(displayPath({ ...full, thumb_url: null }, "thumb")).toBe("u/i/cutout.webp");
});

test("thumb falls all the way through when background removal also failed", () => {
  expect(displayPath({ ...full, thumb_url: null, cutout_url: null }, "thumb")).toBe("u/i/original.jpg");
});

test("full falls through to the original when background removal failed", () => {
  expect(displayPath({ ...full, cutout_url: null }, "full")).toBe("u/i/original.jpg");
});

/**
 * The reader must tolerate a row selected WITHOUT the new column. Six call
 * sites select these rows by hand, and one that forgets `thumb_url` should
 * quietly serve the cutout rather than crash on an undefined property.
 */
test("a row selected without the thumb column still resolves", () => {
  expect(displayPath({ cutout_url: "u/i/cutout.webp", image_url: "u/i/original.jpg" }, "thumb")).toBe(
    "u/i/cutout.webp",
  );
});
