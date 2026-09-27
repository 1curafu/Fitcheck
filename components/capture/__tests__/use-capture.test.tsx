import { renderHook, act, waitFor } from "@testing-library/react";
import { useCapture } from "../use-capture";

const location = vi.hoisted(() => ({ pathname: "/closet/upload" }));
vi.mock("next/navigation", () => ({ usePathname: () => location.pathname }));

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
vi.mock("@/lib/images/worker-client", () => ({
  createSegmenter: vi.fn(() => ({ run: vi.fn(async () => new Blob(["png"])), dispose: vi.fn() })),
}));
vi.mock("@/app/closet/upload/actions", () => ({
  getUploadCapacity: vi.fn(async () => ({ allowed: true, remaining: null })),
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
beforeEach(() => { location.pathname = "/closet/upload"; });

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

  test("an in-flight rotation blocks another turn and saving until the preview settles", async () => {
    const { rotateBlob } = await import("@/lib/images/rotate");
    const { confirmItem } = await import("@/app/closet/upload/actions");
    const { result } = renderHook(() => useCapture());
    await act(async () => { await result.current.capture(new File([], "x.jpg")); });
    const gate = Promise.withResolvers<Blob>();
    vi.mocked(rotateBlob).mockClear().mockImplementationOnce(() => gate.promise);
    vi.mocked(confirmItem).mockClear();
    let rotating!: Promise<void>;
    act(() => { rotating = result.current.rotate(); void result.current.rotate(); void result.current.save(); });
    expect(result.current.rotating).toBe(true);
    expect(rotateBlob).toHaveBeenCalledOnce();
    expect(confirmItem).not.toHaveBeenCalled();
    await act(async () => { gate.resolve(new Blob(["turned"])); await rotating; });
    expect(result.current.rotating).toBe(false);
    expect(result.current.draft?.rotation).toBe(90);
  });

  test("save sends the rotated cutout and thumb only when turned", async () => {
    const { confirmItem } = await import("@/app/closet/upload/actions");
    const onSaved = vi.fn();
    const { result } = renderHook(() => useCapture({ onSaved }));
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
    expect(await onSaved.mock.lastCall?.[1].image.text()).toBe("turned-90");
  });
});

describe("batch capture", () => {
  test("a rapid double Save confirms one item only once", async () => {
    const { confirmItem } = await import("@/app/closet/upload/actions");
    const gate = Promise.withResolvers<{ status: "saved" }>();
    vi.mocked(confirmItem).mockClear().mockImplementationOnce(() => gate.promise);
    const onSaved = vi.fn();
    const { result } = renderHook(() => useCapture({ onSaved }));
    await act(async () => { await result.current.captureMany([new File([], "first.jpg")]); });
    await waitFor(() => expect(result.current.phase).toBe("confirm"));
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => { first = result.current.save(); second = result.current.save(); });
    expect(confirmItem).toHaveBeenCalledOnce();
    gate.resolve({ status: "saved" });
    await act(async () => { await Promise.all([first, second]); });
    expect(onSaved).toHaveBeenCalledOnce();
  });

  test("preflights before processing and keeps two future photos ready during review", async () => {
    const { getUploadCapacity, uploadAndTag } = await import("@/app/closet/upload/actions");
    const { processImage } = await import("@/lib/images/process");
    vi.mocked(getUploadCapacity).mockClear();
    vi.mocked(processImage).mockClear();
    vi.mocked(uploadAndTag).mockClear();
    const onSaved = vi.fn();
    const { result } = renderHook(() => useCapture({ onSaved }));
    const photos = Array.from({ length: 10 }, (_, id) => new File([String(id)], `${id}.jpg`));
    await act(async () => { await result.current.captureMany(photos); });
    await waitFor(() => expect(result.current.draft).not.toBeNull());
    await waitFor(() => expect(vi.mocked(uploadAndTag)).toHaveBeenCalledTimes(3));
    expect(getUploadCapacity).toHaveBeenCalledOnce();
    expect(vi.mocked(processImage).mock.calls.length).toBe(3);
    expect(result.current.batch?.total).toBe(10);
    expect(result.current.batch?.currentIndex).toBe(0);
    await act(async () => { await result.current.save(); });
    await waitFor(() => expect(result.current.draft).not.toBeNull());
    expect(onSaved).toHaveBeenCalledWith("batch", expect.objectContaining({
      image: expect.any(Blob), name: "Tee",
    }));
    expect(result.current.batch?.currentIndex).toBe(1);
    expect(result.current.phase).toBe("confirm");
  });

  test("reserves the last free slot for a failed photo until Skip", async () => {
    const { getUploadCapacity } = await import("@/app/closet/upload/actions");
    const { processImage } = await import("@/lib/images/process");
    vi.mocked(getUploadCapacity).mockResolvedValueOnce({ allowed: true, remaining: 1 });
    vi.mocked(processImage).mockClear().mockRejectedValueOnce(new Error("worker failed"));
    const { result } = renderHook(() => useCapture());
    await act(async () => { await result.current.captureMany([
      new File([], "first.jpg"), new File([], "second.jpg"),
    ]); });
    await waitFor(() => expect(result.current.batch?.currentStage).toBe("failed"));
    expect(vi.mocked(processImage)).toHaveBeenCalledTimes(1);
    await act(async () => { await result.current.retry(); });
    await waitFor(() => expect(result.current.phase).toBe("confirm"));
    expect(vi.mocked(processImage)).toHaveBeenCalledTimes(2);
  });

  test("does not replace an active batch with a second picker selection", async () => {
    const { getUploadCapacity } = await import("@/app/closet/upload/actions");
    vi.mocked(getUploadCapacity).mockClear();
    const { result } = renderHook(() => useCapture());
    await act(async () => { await result.current.captureMany([new File([], "first.jpg")]); });
    await act(async () => { await result.current.captureMany([new File([], "replacement.jpg")]); });
    expect(getUploadCapacity).toHaveBeenCalledOnce();
    expect(result.current.batch?.total).toBe(1);
  });
});

describe("batch cancellation", () => {
  function readyFor(id: string) {
    return {
      status: "ready" as const, itemId: id,
      imagePath: `u/${id}/original.jpg`, cutoutPath: `u/${id}/cutout.webp`, thumbPath: null,
      tags: { category: "Tops", subcategory: "Tee", colors: ["black"],
        pattern: "solid", material: "Cotton", formality: 2, seasons: ["Summer"] } as never,
      rotation: 0 as const,
    };
  }

  test("Finish discards prepared drafts but keeps already saved paths", async () => {
    const { uploadAndTag, discardDraft } = await import("@/app/closet/upload/actions");
    vi.mocked(uploadAndTag).mockResolvedValueOnce(readyFor("first"))
      .mockResolvedValueOnce(readyFor("second"));
    vi.mocked(discardDraft).mockClear();
    const { result } = renderHook(() => useCapture());
    await act(async () => { await result.current.captureMany([
      new File([], "first.jpg"), new File([], "second.jpg"),
    ]); });
    await waitFor(() => expect(result.current.batch?.nextReady).toBe(true));
    await act(async () => { await result.current.save(); });
    await waitFor(() => expect(result.current.draft?.itemId).toBe("second"));
    await act(async () => { await result.current.finish(); });
    expect(result.current.batch?.stopped).toBe(true);
    expect(discardDraft).toHaveBeenCalledWith([
      "u/second/original.jpg", "u/second/cutout.webp", null,
    ]);
    expect(JSON.stringify(vi.mocked(discardDraft).mock.calls)).not.toContain("u/first/original.jpg");
  });

  test("a tag result arriving after Finish is cleaned and never shown", async () => {
    const { uploadAndTag, discardDraft } = await import("@/app/closet/upload/actions");
    const gate = Promise.withResolvers<ReturnType<typeof readyFor>>();
    vi.mocked(uploadAndTag).mockImplementationOnce(() => gate.promise);
    vi.mocked(discardDraft).mockClear();
    const { result } = renderHook(() => useCapture());
    await act(async () => { await result.current.captureMany([new File([], "first.jpg")]); });
    await waitFor(() => expect(uploadAndTag).toHaveBeenCalled());
    await act(async () => { await result.current.finish(); });
    await act(async () => { gate.resolve(readyFor("late")); await gate.promise; });
    await waitFor(() => expect(discardDraft).toHaveBeenCalledWith([
      "u/late/original.jpg", "u/late/cutout.webp", null,
    ]));
    expect(result.current.draft).toBeNull();
  });

  test("Skip clears the foreground and only discards that photo", async () => {
    const { uploadAndTag, discardDraft } = await import("@/app/closet/upload/actions");
    vi.mocked(uploadAndTag).mockResolvedValueOnce(readyFor("first"))
      .mockResolvedValueOnce(readyFor("second"));
    vi.mocked(discardDraft).mockClear();
    const { result } = renderHook(() => useCapture());
    await act(async () => { await result.current.captureMany([
      new File([], "first.jpg"), new File([], "second.jpg"),
    ]); });
    await waitFor(() => expect(result.current.batch?.nextReady).toBe(true));
    await act(async () => { await result.current.skip(); });
    await waitFor(() => expect(result.current.draft?.itemId).toBe("second"));
    expect(discardDraft).toHaveBeenCalledWith([
      "u/first/original.jpg", "u/first/cutout.webp", null,
    ]);
    expect(JSON.stringify(vi.mocked(discardDraft).mock.calls)).not.toContain("u/second/original.jpg");
  });

  test("a rotation finishing after Skip cannot alter the next photo", async () => {
    const { uploadAndTag, confirmItem } = await import("@/app/closet/upload/actions");
    const { rotateBlob } = await import("@/lib/images/rotate");
    vi.mocked(uploadAndTag).mockResolvedValueOnce(readyFor("first"))
      .mockResolvedValueOnce(readyFor("second"));
    const { result } = renderHook(() => useCapture());
    await act(async () => { await result.current.captureMany([
      new File([], "first.jpg"), new File([], "second.jpg"),
    ]); });
    await waitFor(() => expect(result.current.batch?.nextReady).toBe(true));

    const gate = Promise.withResolvers<Blob>();
    vi.mocked(rotateBlob).mockImplementationOnce(() => gate.promise);
    let rotating!: Promise<void>;
    act(() => { rotating = result.current.rotate(); });
    await act(async () => { await result.current.skip(); });
    await waitFor(() => expect(result.current.draft?.itemId).toBe("second"));
    const secondUrl = result.current.draft?.cutoutUrl;

    await act(async () => { gate.resolve(new Blob(["first-rotated"])); await rotating; });
    expect(result.current.draft?.itemId).toBe("second");
    expect(result.current.draft?.rotation).toBe(0);
    expect(result.current.draft?.cutoutUrl).toBe(secondUrl);
    await act(async () => { await result.current.save(); });
    expect(vi.mocked(confirmItem).mock.lastCall?.[0]).toMatchObject({
      itemId: "second", rotated: null,
    });
  });

  test("route departure during confirmation keeps saved images and suppresses stale UI", async () => {
    const { confirmItem, discardDraft } = await import("@/app/closet/upload/actions");
    const gate = Promise.withResolvers<{ status: "saved" }>();
    vi.mocked(confirmItem).mockImplementationOnce(() => gate.promise);
    vi.mocked(discardDraft).mockClear();
    const onSaved = vi.fn();
    const { result, rerender } = renderHook(() => useCapture({ onSaved }));
    await act(async () => { await result.current.captureMany([new File([], "first.jpg")]); });
    await waitFor(() => expect(result.current.phase).toBe("confirm"));
    let saving!: Promise<void>;
    act(() => { saving = result.current.save(); });
    location.pathname = "/closet";
    rerender();
    gate.resolve({ status: "saved" });
    await act(async () => { await saving; });
    expect(discardDraft).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(result.current.batch).toBeNull();
  });

  test("an uncertain save rejection leaves its images for the orphan sweep", async () => {
    const { confirmItem, discardDraft } = await import("@/app/closet/upload/actions");
    const gate = Promise.withResolvers<{ status: "saved" }>();
    vi.mocked(confirmItem).mockImplementationOnce(() => gate.promise);
    vi.mocked(discardDraft).mockClear();
    const { result, rerender } = renderHook(() => useCapture());
    await act(async () => { await result.current.captureMany([new File([], "first.jpg")]); });
    await waitFor(() => expect(result.current.phase).toBe("confirm"));
    let saving!: Promise<void>;
    act(() => { saving = result.current.save(); });
    location.pathname = "/closet";
    rerender();
    gate.reject(new Error("response lost"));
    await act(async () => { await saving; });
    expect(discardDraft).not.toHaveBeenCalled();
    expect(result.current.batch).toBeNull();
  });

  test("a worker completion after Finish cannot restore a draft", async () => {
    const { processImage } = await import("@/lib/images/process");
    const { createSegmenter } = await import("@/lib/images/worker-client");
    const gate = Promise.withResolvers<{ original: Blob; cutout: Blob; cutoutMediaType: "image/webp"; thumb: null; thumbMediaType: null }>();
    vi.mocked(processImage).mockImplementationOnce(() => gate.promise);
    vi.mocked(createSegmenter).mockClear();
    const { result } = renderHook(() => useCapture());
    await act(async () => { await result.current.captureMany([new File([], "first.jpg")]); });
    await act(async () => { await result.current.finish(); });
    await act(async () => { gate.resolve({ original: new Blob(), cutout: new Blob(),
      cutoutMediaType: "image/webp", thumb: null, thumbMediaType: null }); });
    expect(result.current.draft).toBeNull();
    expect(vi.mocked(createSegmenter).mock.results.at(-1)?.value.dispose).toHaveBeenCalledOnce();
  });

  test("a failed capacity read after route departure cannot show an old error", async () => {
    const { getUploadCapacity } = await import("@/app/closet/upload/actions");
    const gate = Promise.withResolvers<{ allowed: true; remaining: null }>();
    vi.mocked(getUploadCapacity).mockImplementationOnce(() => gate.promise);
    const { result, rerender } = renderHook(() => useCapture());
    let starting!: Promise<void>;
    act(() => { starting = result.current.captureMany([new File([], "first.jpg")]); });
    location.pathname = "/closet";
    rerender();
    gate.reject(new Error("old capacity failure"));
    await act(async () => { await starting; });
    expect(result.current.error).toBeNull();
    expect(result.current.batch).toBeNull();
  });

  test("an old capacity read cannot block a new batch after returning to capture", async () => {
    const { getUploadCapacity } = await import("@/app/closet/upload/actions");
    const oldPreflight = Promise.withResolvers<{ allowed: true; remaining: null }>();
    vi.mocked(getUploadCapacity).mockClear().mockImplementationOnce(() => oldPreflight.promise);
    const { result, rerender } = renderHook(() => useCapture());
    let oldStart!: Promise<void>;
    act(() => { oldStart = result.current.captureMany([new File([], "old.jpg")]); });
    location.pathname = "/closet";
    rerender();
    location.pathname = "/closet/upload";
    rerender();
    await act(async () => { await result.current.captureMany([new File([], "new.jpg")]); });
    await waitFor(() => expect(result.current.phase).toBe("confirm"));
    expect(getUploadCapacity).toHaveBeenCalledTimes(2);
    oldPreflight.resolve({ allowed: true, remaining: null });
    await act(async () => { await oldStart; });
    expect(result.current.batch?.total).toBe(1);
    expect(result.current.phase).toBe("confirm");
  });

  test("an old preflight cannot release a newer preflight lock", async () => {
    const { getUploadCapacity } = await import("@/app/closet/upload/actions");
    const first = Promise.withResolvers<{ allowed: true; remaining: null }>();
    const second = Promise.withResolvers<{ allowed: true; remaining: null }>();
    vi.mocked(getUploadCapacity).mockClear()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const { result, rerender } = renderHook(() => useCapture());
    let oldStart!: Promise<void>;
    act(() => { oldStart = result.current.captureMany([new File([], "old.jpg")]); });
    location.pathname = "/closet";
    rerender();
    location.pathname = "/closet/upload";
    rerender();
    let newStart!: Promise<void>;
    act(() => { newStart = result.current.captureMany([new File([], "new.jpg")]); });
    await act(async () => { first.resolve({ allowed: true, remaining: null }); await oldStart; });
    await act(async () => { await result.current.captureMany([new File([], "third.jpg")]); });
    expect(getUploadCapacity).toHaveBeenCalledTimes(2);
    await act(async () => { second.resolve({ allowed: true, remaining: null }); await newStart; });
    await waitFor(() => expect(result.current.phase).toBe("confirm"));
  });

  test("a save finishing after departure releases controls for the next photo", async () => {
    const { confirmItem, uploadAndTag } = await import("@/app/closet/upload/actions");
    const oldSave = Promise.withResolvers<{ status: "saved" }>();
    vi.mocked(confirmItem).mockImplementationOnce(() => oldSave.promise);
    vi.mocked(uploadAndTag).mockResolvedValueOnce(readyFor("first"))
      .mockResolvedValueOnce(readyFor("second"));
    const { result, rerender } = renderHook(() => useCapture());
    await act(async () => { await result.current.captureMany([new File([], "first.jpg")]); });
    await waitFor(() => expect(result.current.phase).toBe("confirm"));
    let saving!: Promise<void>;
    act(() => { saving = result.current.save(); });
    expect(result.current.saving).toBe(true);
    location.pathname = "/closet";
    rerender();
    oldSave.resolve({ status: "saved" });
    await act(async () => { await saving; });
    location.pathname = "/closet/upload";
    rerender();
    await act(async () => { await result.current.captureMany([new File([], "second.jpg")]); });
    await waitFor(() => expect(result.current.draft?.itemId).toBe("second"));
    expect(result.current.saving).toBe(false);
    await act(async () => { await result.current.save(); });
    expect(vi.mocked(confirmItem).mock.lastCall?.[0]).toMatchObject({ itemId: "second" });
  });

  test("returning before an old save settles allows a new save without unlocking it early", async () => {
    const { confirmItem, uploadAndTag } = await import("@/app/closet/upload/actions");
    const oldSave = Promise.withResolvers<{ status: "saved" }>();
    const newSave = Promise.withResolvers<{ status: "saved" }>();
    vi.mocked(confirmItem).mockClear()
      .mockImplementationOnce(() => oldSave.promise)
      .mockImplementationOnce(() => newSave.promise);
    vi.mocked(uploadAndTag).mockResolvedValueOnce(readyFor("first"))
      .mockResolvedValueOnce(readyFor("second"));
    const { result, rerender } = renderHook(() => useCapture());
    await act(async () => { await result.current.captureMany([new File([], "first.jpg")]); });
    await waitFor(() => expect(result.current.draft?.itemId).toBe("first"));
    let savingFirst!: Promise<void>;
    act(() => { savingFirst = result.current.save(); });
    location.pathname = "/closet";
    rerender();
    location.pathname = "/closet/upload";
    rerender();
    await act(async () => { await result.current.captureMany([new File([], "second.jpg")]); });
    await waitFor(() => expect(result.current.draft?.itemId).toBe("second"));
    expect(result.current.saving).toBe(false);
    let savingSecond!: Promise<void>;
    act(() => { savingSecond = result.current.save(); });
    expect(confirmItem).toHaveBeenCalledTimes(2);
    expect(result.current.saving).toBe(true);
    await act(async () => { oldSave.resolve({ status: "saved" }); await savingFirst; });
    expect(result.current.draft?.itemId).toBe("second");
    expect(result.current.saving).toBe(true);
    await act(async () => { newSave.resolve({ status: "saved" }); await savingSecond; });
    expect(result.current.saving).toBe(false);
  });

  test("a single-photo preview completing after departure is discarded", async () => {
    const { rotateBlob } = await import("@/lib/images/rotate");
    const { discardDraft } = await import("@/app/closet/upload/actions");
    const gate = Promise.withResolvers<Blob>();
    vi.mocked(rotateBlob).mockClear().mockImplementationOnce(() => gate.promise);
    vi.mocked(discardDraft).mockClear();
    const { result, rerender } = renderHook(() => useCapture());
    let capturing!: Promise<void>;
    act(() => { capturing = result.current.capture(new File([], "first.jpg")); });
    await waitFor(() => expect(rotateBlob).toHaveBeenCalled());
    location.pathname = "/closet";
    rerender();
    gate.resolve(new Blob(["rotated"]));
    await act(async () => { await capturing; });
    expect(result.current.draft).toBeNull();
    expect(discardDraft).toHaveBeenCalledWith([
      "u/item-1/original.jpg", "u/item-1/cutout.png", null,
    ]);
  });

  test("a finished foreground preview revokes its object URL once", async () => {
    vi.mocked(URL.revokeObjectURL).mockClear();
    const { result, unmount } = renderHook(() => useCapture());
    await act(async () => { await result.current.captureMany([new File([], "first.jpg")]); });
    await waitFor(() => expect(result.current.phase).toBe("confirm"));
    await act(async () => { await result.current.finish(); });
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });
});
