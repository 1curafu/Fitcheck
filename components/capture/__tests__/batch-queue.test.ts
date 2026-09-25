import { describe, expect, it } from "vitest";
import {
  batchSummary, createBatchQueue, currentBatchEntry, markBatch,
  nextProcessable, nextTaggable,
} from "../batch-queue";

function files() {
  return Array.from({ length: 5 }, (_, index) => new File([String(index)], "same.jpg"));
}

describe("batch scheduling", () => {
  it("keeps selection order even when filenames match", () => {
    const selected = files();
    const queue = createBatchQueue(selected, null);
    expect(queue.entries.map((entry) => entry.id)).toEqual([0, 1, 2, 3, 4]);
    queue.entries.forEach((entry, index) => expect(entry.file).toBe(selected[index]));
    expect(nextProcessable(queue)).toBe(0);
  });

  it("holds one foreground plus two future entries across all active stages", () => {
    let queue = createBatchQueue(files(), null);
    queue = markBatch(queue, 0, "tagging");
    queue = markBatch(queue, 1, "ready");
    queue = markBatch(queue, 2, "processed");
    expect(nextProcessable(queue)).toBeNull();
    queue = markBatch(queue, 0, "saved");
    expect(currentBatchEntry(queue)?.id).toBe(1);
    expect(nextProcessable(queue)).toBe(3);
  });

  it("starts at most one processing and one tagging job", () => {
    let queue = createBatchQueue(files(), null);
    queue = markBatch(queue, 0, "processing");
    expect(nextProcessable(queue)).toBeNull();
    queue = markBatch(queue, 0, "processed");
    expect(nextTaggable(queue)).toBe(0);
    queue = markBatch(queue, 0, "tagging");
    queue = markBatch(queue, 1, "processed");
    expect(nextTaggable(queue)).toBeNull();
  });

  it("counts saved and failed photos against finite capacity", () => {
    let queue = createBatchQueue(files(), 1);
    queue = markBatch(queue, 0, "failed");
    expect(nextProcessable(queue)).toBeNull();
    queue = markBatch(queue, 0, "skipped");
    expect(nextProcessable(queue)).toBe(1);
    queue = markBatch(queue, 1, "saved");
    expect(nextProcessable(queue)).toBeNull();
  });

  it("stops new work behind a failed foreground and after Finish", () => {
    let queue = createBatchQueue(files(), null);
    queue = markBatch(queue, 0, "failed");
    expect(nextProcessable(queue)).toBeNull();
    queue = { ...queue, stopped: true };
    expect(nextTaggable(queue)).toBeNull();
  });

  it("reports unsaved photos after early Finish", () => {
    let queue = createBatchQueue(files(), null);
    queue = markBatch(queue, 0, "saved");
    queue = markBatch(queue, 1, "skipped");
    expect(batchSummary({ ...queue, stopped: true })).toEqual({
      saved: 1, skipped: 1, unprocessed: 3, total: 5,
    });
  });

  it("never resumes a saved or skipped entry", () => {
    let queue = createBatchQueue(files(), null);
    queue = markBatch(queue, 0, "saved");
    expect(() => markBatch(queue, 0, "processing")).toThrow();
  });
});
