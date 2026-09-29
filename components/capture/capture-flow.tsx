"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";

import { useEffect, useRef, useState } from "react";

import { useCapture } from "./use-capture";
import { Viewfinder } from "./viewfinder";
import { ConfirmForm } from "./confirm-form";
import { BatchStatus } from "./batch-status";
import { ProgressStrip, type SavedSlotImage } from "./progress-strip";
import { Kicker } from "@/components/ui-fitcheck/kicker";

export function CaptureFlow() {
  const t = useTranslations("capture");
  const router = useRouter();
  const [savedImages, setSavedImages] = useState<SavedSlotImage[]>([]);
  const localUrlsRef = useRef(new Set<string>());
  const cap = useCapture({ onSaved: (mode, preview) => {
    if (mode === "single") {
      router.push("/closet");
      return;
    }
    let src: string | null = null;
    try {
      src = URL.createObjectURL(preview.image);
      localUrlsRef.current.add(src);
    } catch {
      // The item is saved even when its local progress preview cannot render.
    }
    setSavedImages((current) => [...current, { src, name: preview.name }]);
  } });

  useEffect(() => {
    const urls = localUrlsRef.current;
    return () => { for (const url of urls) URL.revokeObjectURL(url); };
  }, []);

  function startBatch(files: File[]) {
    for (const url of localUrlsRef.current) URL.revokeObjectURL(url);
    localUrlsRef.current.clear();
    setSavedImages([]);
    cap.captureMany(files);
  }

  const batchStatus = cap.batch && (
    <BatchStatus batch={cap.batch} saving={cap.saving} error={cap.error}
      onRetry={cap.retry} onSkip={cap.skip} onFinish={cap.finish}
      onEnterCloset={() => router.push("/closet")} />
  );

  return (
    <main className="flex flex-1 flex-col px-6 pb-7 pt-12">
      {cap.phase === "confirm" && cap.draft ? (
        <>
          {cap.batch && <ProgressStrip filled={savedImages.length} images={savedImages} total={cap.batch.total} />}
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
            rejectMode={cap.batch ? "skip" : "retake"}
            onRotate={cap.rotate}
          />
        </>
      ) : cap.batch ? (
        <>
          <Kicker className="mb-[10px] block">{t("addPiece")}</Kicker>
          <h1 className="font-serif text-3xl/[1.12] text-foreground">{t("reviewPieces")}</h1>
          <ProgressStrip filled={savedImages.length} images={savedImages} total={cap.batch.total} />
          {batchStatus}
          {!cap.batch.stopped && cap.batch.currentStage !== "failed" && (
            <div className="surface-stage relative flex aspect-[1.3] items-center justify-center rounded-[18px]">
              <p className="text-sm text-muted-foreground" aria-live="polite">{t("preparingPhoto")}</p>
            </div>
          )}
        </>
      ) : (
        <>
          <Kicker className="mb-[10px] block">{t("addPiece")}</Kicker>
          <h1 className="mb-6 font-serif text-3xl/[1.12] text-foreground">{t("captureItemTitle")}</h1>
          <Viewfinder busy={cap.phase === "removing"} onFile={cap.capture} onMany={startBatch} />
          <p className="mt-6 text-sm text-muted-foreground">
            {t("instructions")}
          </p>
          {cap.error && <p className="mt-4 text-sm text-brand">{cap.error}</p>}
        </>
      )}
    </main>
  );
}
