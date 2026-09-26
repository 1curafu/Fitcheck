import { afterEach, beforeEach, expect, test, vi } from "vitest";

const direct = vi.hoisted(() => vi.fn(async () => new Blob(["direct"])));
vi.mock("../segment", () => ({
  configureRuntime: vi.fn(), segment: direct,
  U2NETP: { url: "/models/u2netp.onnx" }, U2NETP_REFINE: { sharpen: [0.2, 0.8] },
}));

import { createSegmenter } from "../worker-client";

class FakeWorker {
  static made: FakeWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  messages: Array<{ id: number; source: Blob; target: Blob }> = [];
  terminated = false;
  constructor() { FakeWorker.made.push(this); }
  postMessage(message: { id: number; source: Blob; target: Blob }) { this.messages.push(message); }
  terminate() { this.terminated = true; }
  complete(index = 0) {
    this.onmessage?.({ data: { id: this.messages[index].id, ok: true, cutout: new Blob(["png"]) } } as MessageEvent);
  }
}

const source = new Blob(["source"]);
const target = new Blob(["target"]);

beforeEach(() => {
  FakeWorker.made = [];
  direct.mockClear();
  vi.stubGlobal("Worker", FakeWorker);
});
afterEach(() => vi.unstubAllGlobals());

test("lazily creates one worker and reuses it for later photos", async () => {
  const segmenter = createSegmenter();
  expect(FakeWorker.made).toHaveLength(0);
  const first = segmenter.run(source, target);
  expect(FakeWorker.made).toHaveLength(1);
  FakeWorker.made[0].complete();
  await expect(first).resolves.toBeInstanceOf(Blob);
  const second = segmenter.run(source, target);
  expect(FakeWorker.made).toHaveLength(1);
  FakeWorker.made[0].complete(1);
  await expect(second).resolves.toBeInstanceOf(Blob);
  segmenter.dispose();
});

test("uses the direct path if worker construction fails", async () => {
  vi.stubGlobal("Worker", class { constructor() { throw new Error("unsupported"); } });
  const segmenter = createSegmenter();
  await expect(segmenter.run(source, target)).resolves.toBeInstanceOf(Blob);
  expect(direct).toHaveBeenCalledOnce();
});

test("worker failure rejects this photo and makes Retry use the direct path", async () => {
  const segmenter = createSegmenter();
  const first = segmenter.run(source, target);
  FakeWorker.made[0].onerror?.({ message: "worker failed" } as ErrorEvent);
  await expect(first).rejects.toThrow("worker failed");
  expect(FakeWorker.made[0].terminated).toBe(true);
  await expect(segmenter.run(source, target)).resolves.toBeInstanceOf(Blob);
  expect(direct).toHaveBeenCalledOnce();
});

test("disposing terminates and rejects an unfinished photo", async () => {
  const segmenter = createSegmenter();
  const pending = segmenter.run(source, target);
  segmenter.dispose();
  await expect(pending).rejects.toThrow("cancelled");
  expect(FakeWorker.made[0].terminated).toBe(true);
});
