"use client";

import { useEffect, useRef, useState } from "react";
import { processImage, blobToBase64, type ProcessedImage } from "@/lib/images/process";
import { uploadAndTag, confirmItem, discardDraft, getUploadCapacity,
  type UploadAndTagResult } from "@/app/closet/upload/actions";
import { createSegmenter } from "@/lib/images/worker-client";
import { batchSummary, createBatchQueue, currentBatchEntry, markBatch,
  nextProcessable, nextTaggable, type BatchQueue, type BatchStage } from "./batch-queue";
import { rotateBlob } from "@/lib/images/rotate";
import { encodeCutout } from "@/lib/images/encode";
import { encodeThumb } from "@/lib/images/thumb";
import { THUMB_MAX_PX } from "@/lib/images/options";
import type { Rotation, Tags } from "@/lib/ai/tagging-schema";

export type Draft = {
  itemId: string;
  imagePath: string;
  cutoutPath: string;
  thumbPath: string | null;
  /** The uploaded cutout, unrotated. `cutoutUrl` always shows it turned by `rotation`. */
  baseCutout: Blob;
  rotation: Rotation;
  cutoutUrl: string;
  name: string;
  brand: string;
  tags: Tags;
};

export type CapturePhase = "aim" | "removing" | "confirm";
export type CaptureMode = "single" | "batch";
export type BatchView = {
  total: number;
  currentIndex: number | null;
  currentStage: BatchStage | null;
  nextReady: boolean;
  capacityMessage: string | null;
  stopped: boolean;
  summary: ReturnType<typeof batchSummary>;
};

type ReadyUpload = Extract<UploadAndTagResult, { status: "ready" }>;

export function useCapture(options?: { onSaved?: (mode: CaptureMode) => void }) {
  const [phase, setPhase] = useState<CapturePhase>("aim");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [batch, setBatch] = useState<BatchView | null>(null);
  const queueRef = useRef<BatchQueue | null>(null);
  const processedRef = useRef(new Map<number, ProcessedImage>());
  const preparedRef = useRef(new Map<number, { upload: ReadyUpload; cutout: Blob }>());
  const errorsRef = useRef(new Map<number, string>());
  const segmenterRef = useRef<ReturnType<typeof createSegmenter> | null>(null);
  const generationRef = useRef(0);
  const startingRef = useRef(false);
  const activeDraftEntryRef = useRef<number | null>(null);
  const capacityMessageRef = useRef<string | null>(null);
  const serverStoppedRef = useRef(false);
  const onSavedRef = useRef(options?.onSaved);
  onSavedRef.current = options?.onSaved;

  function publishQueue() {
    const queue = queueRef.current;
    if (!queue) { setBatch(null); return; }
    const current = currentBatchEntry(queue);
    const next = current ? queue.entries[current.id + 1] : null;
    setBatch({
      total: queue.entries.length,
      currentIndex: current?.id ?? null,
      currentStage: current?.stage ?? null,
      nextReady: next?.stage === "ready",
      capacityMessage: capacityMessageRef.current,
      stopped: queue.stopped,
      summary: batchSummary(queue),
    });
  }

  function move(id: number, stage: BatchStage) {
    const queue = queueRef.current;
    if (!queue) return;
    queueRef.current = markBatch(queue, id, stage);
    publishQueue();
  }

  async function promote(generation: number) {
    const queue = queueRef.current;
    const current = queue && currentBatchEntry(queue);
    if (!current || current.stage !== "ready") return;
    const prepared = preparedRef.current.get(current.id);
    if (!prepared) return;
    move(current.id, "reviewing");
    try {
      const shown = await rotateBlob(prepared.cutout, prepared.upload.rotation);
      if (generation !== generationRef.current) return;
      activeDraftEntryRef.current = current.id;
      setDraft({
        itemId: prepared.upload.itemId,
        imagePath: prepared.upload.imagePath,
        cutoutPath: prepared.upload.cutoutPath,
        thumbPath: prepared.upload.thumbPath,
        baseCutout: prepared.cutout,
        rotation: prepared.upload.rotation,
        cutoutUrl: URL.createObjectURL(shown),
        name: prepared.upload.tags.subcategory,
        brand: "",
        tags: prepared.upload.tags,
      });
      setError(null);
      setPhase("confirm");
    } catch (cause) {
      if (generation !== generationRef.current) return;
      const message = cause instanceof Error ? cause.message : "Preview failed";
      errorsRef.current.set(current.id, message);
      move(current.id, "failed");
      setError(message);
      setPhase("aim");
    }
  }

  function pump(generation: number) {
    if (generation !== generationRef.current) return;
    let queue = queueRef.current;
    if (!queue || queue.stopped) return;
    const current = currentBatchEntry(queue);
    const active = queue.entries.some((entry) =>
      !["queued", "saved", "skipped"].includes(entry.stage));
    const used = queue.entries.filter((entry) =>
      entry.stage !== "queued" && entry.stage !== "skipped").length;
    if (!current || (!active && queue.allowance !== null && used >= queue.allowance)) {
      queueRef.current = { ...queue, stopped: true };
      setDraft(null);
      setPhase("aim");
      publishQueue();
      return;
    }
    if (current.stage === "failed") setError(errorsRef.current.get(current.id) ?? "Photo failed");
    void promote(generation);
    if (serverStoppedRef.current) return;
    const processId = nextProcessable(queue);
    if (processId !== null) {
      move(processId, "processing");
      void processEntry(processId, queue.entries[processId].file, generation);
    }
    queue = queueRef.current;
    if (!queue) return;
    const tagId = nextTaggable(queue);
    if (tagId !== null) {
      move(tagId, "tagging");
      void tagEntry(tagId, generation);
    }
  }

  async function processEntry(id: number, file: File, generation: number) {
    try {
      segmenterRef.current ??= createSegmenter();
      const result = await processImage(file, segmenterRef.current.run);
      if (generation !== generationRef.current) return;
      processedRef.current.set(id, result);
      move(id, "processed");
      pump(generation);
    } catch (cause) {
      if (generation !== generationRef.current) return;
      const message = cause instanceof Error ? cause.message : "Cutout failed";
      errorsRef.current.set(id, message);
      move(id, "failed");
      if (currentBatchEntry(queueRef.current!)?.id === id) { setError(message); setPhase("aim"); }
      pump(generation);
    }
  }

  async function tagEntry(id: number, generation: number) {
    const processed = processedRef.current.get(id);
    if (!processed) return;
    try {
      const [originalB64, cutoutB64, thumbB64] = await Promise.all([
        blobToBase64(processed.original), blobToBase64(processed.cutout),
        processed.thumb ? blobToBase64(processed.thumb) : Promise.resolve(null),
      ]);
      if (generation !== generationRef.current) return;
      const upload = await uploadAndTag({ originalB64, cutoutB64,
        mediaType: processed.cutoutMediaType, thumbB64,
        thumbMediaType: processed.thumbMediaType });
      if (generation !== generationRef.current) return;
      if (upload.status === "limited") {
        serverStoppedRef.current = true;
        capacityMessageRef.current = upload.message;
        errorsRef.current.set(id, upload.message);
        move(id, "failed");
        if (currentBatchEntry(queueRef.current!)?.id === id) setError(upload.message);
      } else {
        preparedRef.current.set(id, { upload, cutout: processed.cutout });
        processedRef.current.delete(id);
        move(id, "ready");
      }
      pump(generation);
    } catch (cause) {
      if (generation !== generationRef.current) return;
      const message = cause instanceof Error ? cause.message : "Tagging failed";
      errorsRef.current.set(id, message);
      move(id, "failed");
      if (currentBatchEntry(queueRef.current!)?.id === id) setError(message);
      pump(generation);
    }
  }

  async function captureMany(files: File[]) {
    if (files.length === 0 || startingRef.current || (queueRef.current && !queueRef.current.stopped)) return;
    startingRef.current = true;
    setError(null);
    setPhase("removing");
    try {
      const allowance = await getUploadCapacity();
      const generation = ++generationRef.current;
      queueRef.current = createBatchQueue(files, allowance.remaining);
      processedRef.current.clear();
      preparedRef.current.clear();
      errorsRef.current.clear();
      serverStoppedRef.current = false;
      capacityMessageRef.current = allowance.allowed
        ? allowance.remaining !== null && files.length > allowance.remaining
          ? `This closet has room for ${allowance.remaining} more pieces. The rest will remain unprocessed.`
          : null
        : allowance.reason ?? "Your closet is full.";
      if (!allowance.allowed) {
        queueRef.current.stopped = true;
        setError(capacityMessageRef.current);
        setPhase("aim");
      }
      publishQueue();
      if (allowance.allowed) pump(generation);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cannot check closet capacity");
      setPhase("aim");
    } finally {
      startingRef.current = false;
    }
  }

  // Free the object URL when it's replaced by a new capture or on unmount.
  useEffect(() => {
    const url = draft?.cutoutUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [draft?.cutoutUrl]);

  async function capture(file: File) {
    if (startingRef.current || (queueRef.current && !queueRef.current.stopped)) return;
    setError(null);
    setPhase("removing");
    try {
      segmenterRef.current ??= createSegmenter();
      const { original, cutout, cutoutMediaType, thumb, thumbMediaType } =
        await processImage(file, segmenterRef.current.run);
      const [originalB64, cutoutB64, thumbB64] = await Promise.all([
        blobToBase64(original),
        blobToBase64(cutout),
        thumb ? blobToBase64(thumb) : Promise.resolve(null),
      ]);
      const res = await uploadAndTag({
        originalB64,
        cutoutB64,
        mediaType: cutoutMediaType,
        thumbB64,
        thumbMediaType,
      });
      if (res.status === "limited") {
        setError(res.message);
        setPhase("aim");
        return;
      }
      const shown = await rotateBlob(cutout, res.rotation);
      setDraft({
        itemId: res.itemId,
        imagePath: res.imagePath,
        cutoutPath: res.cutoutPath,
        thumbPath: res.thumbPath,
        baseCutout: cutout,
        rotation: res.rotation,
        cutoutUrl: URL.createObjectURL(shown),
        name: res.tags.subcategory,
        brand: "",
        tags: res.tags,
      });
      setPhase("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Capture failed");
      setPhase("aim");
    }
  }

  /**
   * Retake: drop the draft and go back to the viewfinder.
   *
   * ⚠️ **The UI resets FIRST, and the cleanup is best-effort.** The user has
   * already decided this capture is wrong; making them wait on a storage
   * round-trip — or worse, stranding them on the screen they rejected because
   * the delete failed — would be a worse bug than the leak it is tidying.
   * `scripts/sweep-orphan-uploads.ts` remains the backstop for anything that
   * fails here, and for the paths this can never reach: crashes, closed tabs,
   * dead connections.
   */
  async function discard() {
    const abandoned = draft;
    setDraft(null);
    setPhase("aim");
    setError(null);
    if (!abandoned) return;

    try {
      await discardDraft([abandoned.imagePath, abandoned.cutoutPath, abandoned.thumbPath]);
    } catch {
      // Swept later rather than surfaced now — see above.
    }
  }

  function updateDraft(patch: Partial<Draft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  }

  async function rotate() {
    if (!draft) return;
    const next = ((draft.rotation + 90) % 360) as Rotation;
    const shown = await rotateBlob(draft.baseCutout, next);
    setDraft((d) => (d ? { ...d, rotation: next, cutoutUrl: URL.createObjectURL(shown) } : d));
  }

  function updateTags(patch: Partial<Tags>) {
    setDraft((d) => (d ? { ...d, tags: { ...d.tags, ...patch } } : d));
  }

  function toggleSeason(s: Tags["seasons"][number]) {
    setDraft((d) => {
      if (!d) return d;
      const cur = d.tags.seasons;
      const next = cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s];
      return next.length ? { ...d, tags: { ...d.tags, seasons: next } } : d;
    });
  }

  async function save() {
    if (!draft || savingRef.current) return;
    savingRef.current = true;
    const activeQueue = queueRef.current;
    const batchEntry = activeQueue && !activeQueue.stopped ? currentBatchEntry(activeQueue) : null;
    if (batchEntry) move(batchEntry.id, "saving");
    setSaving(true);
    setError(null);
    try {
      let rotated = null;
      if (draft.rotation !== 0) {
        const { blob, mediaType } = await encodeCutout(await rotateBlob(draft.baseCutout, draft.rotation));
        const thumb = await encodeThumb(blob, THUMB_MAX_PX);
        rotated = {
          cutoutB64: await blobToBase64(blob),
          mediaType,
          thumbB64: thumb ? await blobToBase64(thumb.blob) : null,
          thumbMediaType: thumb?.mediaType ?? null,
        };
      }
      const result = await confirmItem({
        itemId: draft.itemId,
        imagePath: draft.imagePath,
        cutoutPath: draft.cutoutPath,
        thumbPath: draft.thumbPath,
        name: draft.name || null,
        brand: draft.brand || null,
        tags: draft.tags,
        rotated,
      });
      if (result.status === "limited") {
        setError(result.message);
        if (batchEntry) move(batchEntry.id, "reviewing");
        return;
      }
      if (batchEntry) {
        preparedRef.current.delete(batchEntry.id);
        processedRef.current.delete(batchEntry.id);
        activeDraftEntryRef.current = null;
        move(batchEntry.id, "saved");
      }
      onSavedRef.current?.(batchEntry ? "batch" : "single");
      setDraft(null);
      setPhase(batchEntry ? "removing" : "aim");
      if (batchEntry) pump(generationRef.current);
    } catch (e) {
      if (batchEntry) move(batchEntry.id, "reviewing");
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function skip() {
    const queue = queueRef.current;
    const current = queue && currentBatchEntry(queue);
    if (!current || queue!.stopped || savingRef.current) return;
    const prepared = preparedRef.current.get(current.id);
    preparedRef.current.delete(current.id);
    processedRef.current.delete(current.id);
    errorsRef.current.delete(current.id);
    activeDraftEntryRef.current = null;
    move(current.id, "skipped");
    setDraft(null);
    setError(null);
    setPhase("removing");
    if (prepared) {
      try { await discardDraft([prepared.upload.imagePath, prepared.upload.cutoutPath, prepared.upload.thumbPath]); }
      catch { /* orphan sweep backstop */ }
    }
    pump(generationRef.current);
  }

  function retry() {
    const queue = queueRef.current;
    const current = queue && currentBatchEntry(queue);
    if (!current || current.stage !== "failed" || queue!.stopped) return;
    errorsRef.current.delete(current.id);
    serverStoppedRef.current = false;
    setError(null);
    const nextStage: BatchStage = preparedRef.current.has(current.id) ? "ready"
      : processedRef.current.has(current.id) ? "processed" : "queued";
    move(current.id, nextStage);
    setPhase("removing");
    pump(generationRef.current);
  }

  async function finish() {
    const queue = queueRef.current;
    if (!queue || queue.stopped || savingRef.current) return;
    generationRef.current += 1;
    queueRef.current = { ...queue, stopped: true };
    setDraft(null);
    setPhase("aim");
    publishQueue();
  }

  function cancel() { void finish(); }

  return { phase, draft, error, saving, batch, capture, captureMany,
    discard, skip, retry, finish, cancel, updateDraft, updateTags, toggleSeason, rotate, save };
}
