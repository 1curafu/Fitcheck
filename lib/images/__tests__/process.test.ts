import { processImage } from "../process";

const segment = vi.fn(async () => new Blob(["png"]));
const getExifOrientation = vi.fn(async (_f: File) => 1);
vi.mock("browser-image-compression", () => ({
  default: Object.assign(
    vi.fn(async () => new Blob(["compressed"])),
    { getExifOrientation: (f: File) => getExifOrientation(f) },
  ),
}));
vi.mock("../segment", () => ({
  segment: (...a: unknown[]) => segment(...(a as [])),
  configureRuntime: vi.fn(),
  U2NETP: { url: "/models/u2netp.onnx" },
  U2NETP_REFINE: { sharpen: [0.2, 0.8] },
}));
vi.mock("../encode", () => ({ encodeCutout: vi.fn(async (b: Blob) => ({ blob: b, mediaType: "image/png" })) }));
vi.mock("../thumb", () => ({ encodeThumb: vi.fn(async () => null) }));

const file = new File(["jpeg"], "x.jpg", { type: "image/jpeg" });

beforeEach(() => segment.mockClear());

test("an upright photo: the model sees the ORIGINAL file, the cutout is built on the compressed one", async () => {
  getExifOrientation.mockResolvedValueOnce(1);
  await processImage(file);
  const [source, , target] = segment.mock.calls[0] as unknown as [Blob, unknown, Blob];
  expect(source).toBe(file);
  expect(target).not.toBe(file);
});

test("a photo with no EXIF at all still goes to the model as the original", async () => {
  getExifOrientation.mockResolvedValueOnce(-1);
  await processImage(file);
  expect((segment.mock.calls[0] as unknown as [Blob])[0]).toBe(file);
});

test("an EXIF-rotated photo: the model sees the compressed, already-upright image — never a raw decode", async () => {
  // ⚠️ CI (Linux WebKit) decoded the raw file sideways while the compressed
  // target was upright; the mask then never matched and capture failed.
  getExifOrientation.mockResolvedValueOnce(6);
  await processImage(file);
  const [source, , target] = segment.mock.calls[0] as unknown as [Blob, unknown, Blob];
  expect(source).not.toBe(file);
  expect(source).toBe(target);
});
