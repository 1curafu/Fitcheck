import { encodeCutout, cutoutFilename } from "../encode";

const blobOf = (bytes: number, type: string) => new Blob([new Uint8Array(bytes)], { type });

const png = blobOf(1000, "image/png");

test("uses WebP when the encoder produces a smaller WebP", async () => {
  const out = await encodeCutout(png, async () => blobOf(200, "image/webp"));
  expect(out.mediaType).toBe("image/webp");
  expect(out.blob.size).toBe(200);
});

// Safari and older WebKit silently hand back a PNG when asked for WebP, rather
// than failing. Trusting the request instead of the result would upload a PNG
// labelled image/webp — broken in Storage and rejected by the tagger.
test("falls back to PNG when the encoder returns some other format", async () => {
  const out = await encodeCutout(png, async () => blobOf(200, "image/png"));
  expect(out.mediaType).toBe("image/png");
  expect(out.blob).toBe(png);
});
test("falls back to PNG when the encoder returns nothing", async () => {
  const out = await encodeCutout(png, async () => null);
  expect(out.mediaType).toBe("image/png");
  expect(out.blob).toBe(png);
});

// A flat cutout with large uniform transparent areas can encode LARGER as WebP
// than as PNG. Keeping whichever is smaller means this can never make things worse.
test("keeps the PNG when the WebP would be bigger", async () => {
  const out = await encodeCutout(png, async () => blobOf(1500, "image/webp"));
  expect(out.mediaType).toBe("image/png");
});
test("survives an encoder that throws", async () => {
  const out = await encodeCutout(png, async () => {
    throw new Error("canvas unavailable");
  });
  expect(out.mediaType).toBe("image/png");
});

test("the stored filename follows the format actually produced", () => {
  expect(cutoutFilename("image/webp")).toBe("cutout.webp");
  expect(cutoutFilename("image/png")).toBe("cutout.png");
});
