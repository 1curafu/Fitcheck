"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCapture } from "./use-capture";
import { Viewfinder } from "./viewfinder";
import { ConfirmForm } from "./confirm-form";
import { BatchStatus } from "./batch-status";
import { ProgressStrip } from "./progress-strip";
import { Kicker } from "@/components/ui-fitcheck/kicker";

export function OnboardingCapture({ initialCount = 0 }: { initialCount?: number }) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const cap = useCapture({ onSaved: () => setCount((c) => c + 1) });

  const hasItems = count >= 1;

  const batchStatus = cap.batch && (
    <BatchStatus batch={cap.batch} saving={cap.saving} error={cap.error}
      onRetry={cap.retry} onSkip={cap.skip} onFinish={cap.finish}
      onEnterCloset={() => router.push("/closet")} />
  );

  if (cap.phase === "confirm" && cap.draft && !cap.batch) {
    return (
      <main className="screen-top flex flex-1 flex-col px-6 pb-7">
        <ConfirmForm
          draft={cap.draft}
          saving={cap.saving}
          rotating={cap.rotating}
          error={cap.error}
          onDraft={cap.updateDraft}
          onTags={cap.updateTags}
          onToggleSeason={cap.toggleSeason}
          onSave={cap.save}
          onRetake={cap.discard}
          onRotate={cap.rotate}
        />
      </main>
    );
  }

  return (
    <main className="screen-top flex flex-1 flex-col px-6 pb-7">
      <Kicker className="mb-[10px] block">Almost there</Kicker>
      <h1 className="mb-[6px] font-serif text-3xl/[1.12] text-foreground">
        Capture your first five.
      </h1>
      {!cap.batch && (
        <>
          <p className="mb-6 text-sm text-muted-foreground">
            Snap each piece on a flat surface that contrasts with it — dark clothes on a pale floor. We cut it out and learn its colour, fabric and formality.
          </p>
          <Viewfinder busy={cap.phase === "removing"} onFile={cap.capture} onMany={cap.captureMany} />
        </>
      )}
      <ProgressStrip filled={count} />
      {batchStatus}
      {cap.batch && cap.phase === "confirm" && cap.draft && (
        <ConfirmForm draft={cap.draft} saving={cap.saving} rotating={cap.rotating} error={cap.error}
          onDraft={cap.updateDraft} onTags={cap.updateTags}
          onToggleSeason={cap.toggleSeason} onSave={cap.save}
          onRetake={cap.skip} rejectLabel="Skip photo" onRotate={cap.rotate} />
      )}
      {cap.batch && !cap.batch.stopped && cap.phase !== "confirm" &&
        cap.batch.currentStage !== "failed" && (
          <div className="surface-stage relative flex aspect-[1.3] items-center justify-center rounded-[18px]">
            <p className="text-sm text-muted-foreground" aria-live="polite">Preparing this photo…</p>
          </div>
        )}
      {!cap.batch && cap.error && <p className="mt-4 text-sm text-brand">{cap.error}</p>}
      <div className="flex-1" />
      {!cap.batch && (
        <button
          onClick={() => router.push("/closet")}
          className={`mt-[22px] rounded-[12px] py-[17px] text-center font-semibold transition-colors ${
            hasItems ? "bg-brand text-canvas" : "bg-foreground/10 text-muted-dim"
          }`}
        >
          {hasItems ? "Enter your closet" : "Skip for now"}
        </button>
      )}
    </main>
  );
}
