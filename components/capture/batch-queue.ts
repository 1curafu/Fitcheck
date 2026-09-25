export type BatchStage =
  | "queued" | "processing" | "processed" | "tagging" | "ready"
  | "reviewing" | "saving" | "failed" | "saved" | "skipped";

export type BatchEntry = { id: number; file: File; stage: BatchStage };
export type BatchQueue = { entries: BatchEntry[]; allowance: number | null; stopped: boolean };

export function createBatchQueue(files: File[], allowance: number | null): BatchQueue {
  return {
    entries: files.map((file, id) => ({ id, file, stage: "queued" })),
    allowance,
    stopped: false,
  };
}

export function markBatch(queue: BatchQueue, id: number, stage: BatchStage): BatchQueue {
  const entry = queue.entries[id];
  if (!entry || entry.id !== id) throw new Error("Unknown batch photo");
  if ((entry.stage === "saved" || entry.stage === "skipped") && entry.stage !== stage) {
    throw new Error("Batch photo is complete");
  }
  return { ...queue, entries: queue.entries.map((item) =>
    item.id === id ? { ...item, stage } : item) };
}

export function currentBatchEntry(queue: BatchQueue): BatchEntry | null {
  return queue.entries.find((entry) => entry.stage !== "saved" && entry.stage !== "skipped") ?? null;
}

export function nextProcessable(queue: BatchQueue): number | null {
  if (queue.stopped || queue.entries.some((entry) => entry.stage === "processing")) return null;
  const foreground = currentBatchEntry(queue);
  if (!foreground || foreground.stage === "failed") return null;
  const reserved = queue.entries.filter((entry) =>
    entry.stage !== "queued" && entry.stage !== "skipped").length;
  if (queue.allowance !== null && reserved >= queue.allowance) return null;
  const futureStarted = queue.entries.filter((entry) =>
    entry.id > foreground.id && entry.stage !== "queued" &&
    entry.stage !== "saved" && entry.stage !== "skipped").length;
  if (futureStarted >= 2) return null;
  return queue.entries.find((entry) => entry.stage === "queued")?.id ?? null;
}

export function nextTaggable(queue: BatchQueue): number | null {
  if (queue.stopped || queue.entries.some((entry) => entry.stage === "tagging") ||
      currentBatchEntry(queue)?.stage === "failed") return null;
  return queue.entries.find((entry) => entry.stage === "processed")?.id ?? null;
}

export function batchSummary(queue: BatchQueue) {
  const saved = queue.entries.filter((entry) => entry.stage === "saved").length;
  const skipped = queue.entries.filter((entry) => entry.stage === "skipped").length;
  return { saved, skipped, unprocessed: queue.entries.length - saved - skipped, total: queue.entries.length };
}
