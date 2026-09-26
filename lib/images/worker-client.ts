import { configureRuntime, segment, U2NETP, U2NETP_REFINE } from "./segment";

export type SegmentCutout = (source: Blob, target: Blob) => Promise<Blob>;

export async function directSegmentCutout(source: Blob, target: Blob): Promise<Blob> {
  configureRuntime("/ort/");
  return segment(source, U2NETP, target, U2NETP_REFINE);
}

type WorkerResponse =
  | { id: number; ok: true; cutout: Blob }
  | { id: number; ok: false; message: string };

/** One reusable ONNX worker per capture flow, with an explicit direct-path fallback. */
export function createSegmenter(): { run: SegmentCutout; dispose(): void } {
  let worker: Worker | null = null;
  let direct = false;
  let disposed = false;
  let id = 0;
  let pending: { id: number; resolve: (blob: Blob) => void; reject: (error: Error) => void } | null = null;

  function stopWorker() {
    worker?.terminate();
    worker = null;
  }

  function fail(error: Error) {
    const job = pending;
    pending = null;
    direct = true;
    stopWorker();
    job?.reject(error);
  }

  const run: SegmentCutout = (source, target) => {
    if (disposed) return Promise.reject(new Error("Cutout cancelled"));
    if (direct || typeof Worker === "undefined") return directSegmentCutout(source, target);
    if (pending) return Promise.reject(new Error("Cutout worker busy"));
    if (!worker) {
      try {
        worker = new Worker(new URL("./segment.worker.ts", import.meta.url), { type: "module" });
        worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          const message = event.data;
          if (!pending || message.id !== pending.id) return;
          if (!message.ok) { fail(new Error(message.message)); return; }
          const job = pending;
          pending = null;
          job.resolve(message.cutout);
        };
        worker.onerror = (event) => fail(new Error(event.message || "Cutout worker failed"));
        worker.onmessageerror = () => fail(new Error("Cutout worker response failed"));
      } catch {
        direct = true;
        stopWorker();
        return directSegmentCutout(source, target);
      }
    }
    return new Promise<Blob>((resolve, reject) => {
      const nextId = ++id;
      pending = { id: nextId, resolve, reject };
      try { worker!.postMessage({ id: nextId, source, target }); }
      catch (error) { fail(error instanceof Error ? error : new Error("Cutout worker failed")); }
    });
  };

  return {
    run,
    dispose() {
      disposed = true;
      const job = pending;
      pending = null;
      stopWorker();
      job?.reject(new Error("Cutout cancelled"));
    },
  };
}
