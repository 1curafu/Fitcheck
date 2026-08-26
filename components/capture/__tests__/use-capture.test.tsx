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
    // ⚠️ The real action always returns this key. `vi.mock` is untyped, so an
    // omission here does not fail the build — it just silently hands the hook
    // `undefined` where the contract says `string | null`.
    thumbPath: null,
    tags: {
      category: "Tops", subcategory: "Tee", colors: ["black"],
      pattern: "solid", material: "Cotton", formality: 2, seasons: ["Summer"],
    },
  })),
  confirmItem: vi.fn(async () => undefined),
  discardDraft: vi.fn(async () => undefined),
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


/**
 * Retake. The user has looked at the cutout, decided it is wrong, and wants
 * out — the screen offered no such way until now, so their only options were
 * to save a damaged image or navigate away and strand both uploaded blobs.
 */
describe("discard", () => {
  test("returns to the viewfinder and drops the draft", async () => {
    const { result } = renderHook(() => useCapture());
    await act(async () => {
      await result.current.capture(new File([], "x.jpg"));
    });
    expect(result.current.phase).toBe("confirm");

    await act(async () => {
      await result.current.discard();
    });
    expect(result.current.phase).toBe("aim");
    expect(result.current.draft).toBeNull();
  });

  test("deletes the blobs the abandoned capture already uploaded", async () => {
    const { discardDraft } = await import("@/app/closet/upload/actions");
    const { result } = renderHook(() => useCapture());
    await act(async () => {
      await result.current.capture(new File([], "x.jpg"));
    });
    await act(async () => {
      await result.current.discard();
    });
    expect(discardDraft).toHaveBeenCalledWith([
      "u/item-1/original.jpg",
      "u/item-1/cutout.png",
      null,
    ]);
  });

  /**
   * ⚠️ The cleanup must never trap the user on a screen they have already
   * rejected. `scripts/sweep-orphan-uploads.ts` is the backstop for whatever
   * fails here, so failing quietly is correct — refusing to navigate is not.
   */
  test("still returns to the viewfinder when the cleanup fails", async () => {
    const { discardDraft } = await import("@/app/closet/upload/actions");
    vi.mocked(discardDraft).mockRejectedValueOnce(new Error("offline"));

    const { result } = renderHook(() => useCapture());
    await act(async () => {
      await result.current.capture(new File([], "x.jpg"));
    });
    await act(async () => {
      await result.current.discard();
    });
    expect(result.current.phase).toBe("aim");
    expect(result.current.error).toBeNull();
  });
});
