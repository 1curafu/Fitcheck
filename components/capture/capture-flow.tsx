"use client";

import { useRouter } from "next/navigation";
import { useCapture } from "./use-capture";
import { Viewfinder } from "./viewfinder";
import { ConfirmForm } from "./confirm-form";
import { BatchStatus } from "./batch-status";
import { Kicker } from "@/components/ui-fitcheck/kicker";

export function CaptureFlow() {
  const router = useRouter();
  const cap = useCapture({ onSaved: (mode) => {
    if (mode === "single") router.push("/closet");
  } });

  const batchStatus = cap.batch && (
    <BatchStatus batch={cap.batch} saving={cap.saving} error={cap.error}
      onRetry={cap.retry} onSkip={cap.skip} onFinish={cap.finish}
      onEnterCloset={() => router.push("/closet")} />
  );

  return (
    <main className="flex flex-1 flex-col px-6 pb-7 pt-12">
      {cap.phase === "confirm" && cap.draft ? (
        <>
          {batchStatus}
          <ConfirmForm
            draft={cap.draft}
            saving={cap.saving}
            rotating={cap.rotating}
            error={cap.error}
            onDraft={cap.updateDraft}
            onTags={cap.updateTags}
            onToggleSeason={cap.toggleSeason}
            onSave={cap.save}
            onRetake={cap.batch ? cap.skip : cap.discard}
            rejectLabel={cap.batch ? "Skip photo" : "Retake"}
            onRotate={cap.rotate}
          />
        </>
      ) : cap.batch ? (
        <>
          <Kicker className="mb-[10px] block">Add a piece</Kicker>
          <h1 className="mb-6 font-serif text-3xl/[1.12] text-foreground">Review your pieces.</h1>
          {batchStatus}
          {!cap.batch.stopped && cap.batch.currentStage !== "failed" && (
            <div className="surface-stage relative flex aspect-[1.3] items-center justify-center rounded-[18px]">
              <p className="text-sm text-muted-foreground" aria-live="polite">Preparing this photo…</p>
            </div>
          )}
        </>
      ) : (
        <>
          <Kicker className="mb-[10px] block">Add a piece</Kicker>
          <h1 className="mb-6 font-serif text-3xl/[1.12] text-foreground">Capture an item.</h1>
          <Viewfinder busy={cap.phase === "removing"} onFile={cap.capture} onMany={cap.captureMany} />
          <p className="mt-6 text-sm text-muted-foreground">
            Snap each piece on a flat surface that contrasts with it — dark clothes on a pale floor. We cut it out and learn its colour, fabric and formality.
          </p>
          {cap.error && <p className="mt-4 text-sm text-brand">{cap.error}</p>}
        </>
      )}
    </main>
  );
}
