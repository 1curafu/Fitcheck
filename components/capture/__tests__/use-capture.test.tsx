import { renderHook, act } from "@testing-library/react";
import { useCapture } from "../use-capture";

vi.mock("@/lib/images/process", () => ({
  processImage: vi.fn(async () => ({ original: new Blob(), cutout: new Blob() })),
  blobToBase64: vi.fn(async () => "b64"),
}));
vi.mock("@/app/closet/upload/actions", () => ({
  uploadAndTag: vi.fn(async () => ({
    itemId: "item-1",
    imagePath: "u/item-1/original.jpg",
    cutoutPath: "u/item-1/cutout.png",
    tags: {
      category: "Tops", subcategory: "Tee", colors: ["black"],
      pattern: "Solid", material: "Cotton", formality: 2, seasons: ["Summer"],
    },
  })),
  confirmItem: vi.fn(async () => undefined),
}));

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:mock");
  URL.revokeObjectURL = vi.fn();
});

test("capture moves aim → confirm and builds a draft", async () => {
  const { result } = renderHook(() => useCapture());
  expect(result.current.phase).toBe("aim");
  await act(async () => {
    await result.current.capture(new File([], "x.jpg"));
  });
  expect(result.current.phase).toBe("confirm");
  expect(result.current.draft?.tags.category).toBe("Tops");
  expect(result.current.draft?.name).toBe("Tee");
});

test("successful save calls onSaved and resets to aim", async () => {
  const onSaved = vi.fn();
  const { result } = renderHook(() => useCapture({ onSaved }));
  await act(async () => {
    await result.current.capture(new File([], "x.jpg"));
  });
  await act(async () => {
    await result.current.save();
  });
  expect(onSaved).toHaveBeenCalledOnce();
  expect(result.current.phase).toBe("aim");
  expect(result.current.draft).toBeNull();
});

test("failed save sets error, stays on confirm, skips onSaved", async () => {
  const { confirmItem } = await import("@/app/closet/upload/actions");
  (confirmItem as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("nope"));
  const onSaved = vi.fn();
  const { result } = renderHook(() => useCapture({ onSaved }));
  await act(async () => {
    await result.current.capture(new File([], "x.jpg"));
  });
  await act(async () => {
    await result.current.save();
  });
  expect(onSaved).not.toHaveBeenCalled();
  expect(result.current.error).toBe("nope");
  expect(result.current.phase).toBe("confirm");
});
