import { renderHook, act } from "@testing-library/react";
import { useCapture } from "../use-capture";

vi.mock("@/lib/images/process", () => ({
  processImage: vi.fn(async () => ({ original: new Blob(), cutout: new Blob(["cut"]) })),
  blobToBase64: vi.fn(async () => "b64"),
}));
vi.mock("@/lib/images/rotate", () => ({
  rotateBlob: vi.fn(async (b: Blob, r: number) => (r === 0 ? b : new Blob([`turned-${r}`]))),
}));
vi.mock("@/lib/images/encode", () => ({
  encodeCutout: vi.fn(async (b: Blob) => ({ blob: b, mediaType: "image/webp" })),
}));
vi.mock("@/lib/images/thumb", () => ({
  encodeThumb: vi.fn(async () => ({ blob: new Blob(["thumb"]), mediaType: "image/webp" })),
}));
vi.mock("@/app/closet/upload/actions", () => ({
  uploadAndTag: vi.fn(async () => ({
    status: "ready",
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
    rotation: 0,
  })),
  confirmItem: vi.fn(async () => ({ status: "saved" })),
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

test("a server upload limit leaves capture available and explains the limit", async () => {
  const { uploadAndTag } = await import("@/app/closet/upload/actions");
  vi.mocked(uploadAndTag).mockResolvedValueOnce({ status: "limited", message: "closet full" });
  const { result } = renderHook(() => useCapture());
  await act(async () => { await result.current.capture(new File([], "x.jpg")); });
  expect(result.current.phase).toBe("aim");
  expect(result.current.draft).toBeNull();
  expect(result.current.error).toBe("closet full");
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

test("confirmation uses the upload id", async () => {
  const { confirmItem } = await import("@/app/closet/upload/actions");
  const { result } = renderHook(() => useCapture());
  await act(async () => { await result.current.capture(new File([], "x.jpg")); });
  await act(async () => { await result.current.save(); });
  expect(vi.mocked(confirmItem).mock.lastCall?.[0]).toMatchObject({ itemId: "item-1" });
});

test("confirmation limit keeps the editable draft", async () => {
  const { confirmItem } = await import("@/app/closet/upload/actions");
  vi.mocked(confirmItem).mockResolvedValueOnce({ status: "limited", message: "closet full" });
  const onSaved = vi.fn();
  const { result } = renderHook(() => useCapture({ onSaved }));
  await act(async () => { await result.current.capture(new File([], "x.jpg")); });
  act(() => result.current.updateDraft({ name: "My knit" }));
  await act(async () => { await result.current.save(); });
  expect(result.current.phase).toBe("confirm");
  expect(result.current.draft?.name).toBe("My knit");
  expect(result.current.error).toBe("closet full");
  expect(onSaved).not.toHaveBeenCalled();
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

describe("rotation", () => {
  test("the model's rotation is applied to the preview before the user sees it", async () => {
    const { uploadAndTag } = await import("@/app/closet/upload/actions");
    const { rotateBlob } = await import("@/lib/images/rotate");
    vi.mocked(uploadAndTag).mockResolvedValueOnce({
      status: "ready",
      itemId: "i", imagePath: "u/i/original.jpg", cutoutPath: "u/i/cutout.png", thumbPath: null,
      tags: { category: "Tops", subcategory: "Tee", colors: ["black"], pattern: "solid", material: "Cotton", formality: 2, seasons: ["Summer"] } as never,
      rotation: 90,
    });
    const { result } = renderHook(() => useCapture());
    await act(async () => {
      await result.current.capture(new File([], "x.jpg"));
    });
    expect(result.current.draft?.rotation).toBe(90);
    expect(vi.mocked(rotateBlob)).toHaveBeenLastCalledWith(expect.any(Blob), 90);
  });

  test("rotate advances a quarter turn and wraps", async () => {
    const { result } = renderHook(() => useCapture());
    await act(async () => {
      await result.current.capture(new File([], "x.jpg"));
    });
    for (const expected of [90, 180, 270, 0]) {
      await act(async () => {
        await result.current.rotate();
      });
      expect(result.current.draft?.rotation).toBe(expected);
    }
  });

  test("save sends the rotated cutout and thumb only when turned", async () => {
    const { confirmItem } = await import("@/app/closet/upload/actions");
    const { result } = renderHook(() => useCapture());
    await act(async () => {
      await result.current.capture(new File([], "x.jpg"));
    });
    await act(async () => {
      await result.current.save();
    });
    expect(vi.mocked(confirmItem).mock.lastCall?.[0]).toMatchObject({ rotated: null });

    await act(async () => {
      await result.current.capture(new File([], "x.jpg"));
    });
    await act(async () => {
      await result.current.rotate();
    });
    await act(async () => {
      await result.current.save();
    });
    expect(vi.mocked(confirmItem).mock.lastCall?.[0]).toMatchObject({
      rotated: { cutoutB64: "b64", mediaType: "image/webp", thumbB64: "b64", thumbMediaType: "image/webp" },
    });
  });
});
