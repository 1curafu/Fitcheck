import { compressionOptions } from "../options";

test("compresses to <=0.5MB, max edge 1280, JPEG, via web worker", () => {
  expect(compressionOptions()).toEqual({
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: "image/jpeg",
  });
});
