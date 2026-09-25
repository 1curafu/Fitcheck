import type { BatchView } from "./use-capture";

export function BatchStatus({ batch, saving, error, onRetry, onSkip, onFinish, onEnterCloset }: {
  batch: BatchView;
  saving: boolean;
  error: string | null;
  onRetry: () => void;
  onSkip: () => void;
  onFinish: () => void;
  onEnterCloset: () => void;
}) {
  if (batch.stopped) {
    const { saved, skipped, unprocessed } = batch.summary;
    return (
      <section className="flex flex-1 flex-col gap-5" aria-label="Batch summary">
        <p className="font-serif text-2xl text-foreground">Your capture is complete.</p>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {saved} saved · {skipped} skipped · {unprocessed} unprocessed
        </p>
        <p className="text-sm text-muted-foreground">
          Saved pieces are in your closet. Unprocessed photos were not saved.
        </p>
        {batch.capacityMessage && (
          <p className="text-sm text-brand-high">{batch.capacityMessage}</p>
        )}
        <div className="flex-1" />
        <button type="button" onClick={onEnterCloset}
          className="min-h-[54px] rounded-[12px] bg-foreground px-5 py-[17px] font-semibold text-canvas">
          Enter closet
        </button>
      </section>
    );
  }

  return (
    <section className="mb-5" aria-label="Batch progress">
      <div className="flex items-baseline justify-between gap-3" aria-live="polite">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Photo {(batch.currentIndex ?? batch.total - 1) + 1} of {batch.total}
        </p>
        <p className="text-xs text-muted-foreground">
          {batch.currentIndex === batch.total - 1 ? "Last photo" :
            batch.nextReady ? "Next photo ready" : "Preparing next photo"}
        </p>
      </div>
      {batch.capacityMessage && (
        <p className="mt-3 text-sm text-muted-foreground">{batch.capacityMessage}</p>
      )}
      {batch.currentStage === "failed" && (
        <div className="mt-5">
          <p role="alert" className="text-sm text-brand-high">{error ?? "Photo preparation failed."}</p>
          <div className="mt-3 flex gap-3">
            <button type="button" onClick={onRetry}
              className="min-h-11 flex-1 rounded-[12px] bg-foreground px-4 text-sm font-semibold text-canvas">
              Retry photo
            </button>
            <button type="button" onClick={onSkip}
              className="min-h-11 flex-1 rounded-[12px] border border-[--input] px-4 text-sm text-foreground">
              Skip photo
            </button>
          </div>
        </div>
      )}
      <button type="button" onClick={onFinish} disabled={saving}
        className="mt-5 min-h-11 text-sm text-muted-foreground underline underline-offset-4 disabled:opacity-60">
        Finish batch
      </button>
      <p className="text-xs text-muted-foreground">
        Photos still waiting in this batch will not be saved when you finish.
      </p>
    </section>
  );
}
