"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("capture.batch");
  if (batch.stopped) {
    const { saved, skipped, unprocessed } = batch.summary;
    return (
      <section className="flex flex-1 flex-col gap-5" aria-label={t("summaryLabel")}>
        <p className="font-serif text-2xl text-foreground">{t("complete")}</p>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t("counts", { saved, skipped, unprocessed })}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("summaryHint")}
        </p>
        {batch.capacityMessage && (
          <p className="text-sm text-brand-high">{batch.capacityMessage}</p>
        )}
        <div className="flex-1" />
        <button type="button" onClick={onEnterCloset}
          className="min-h-[54px] rounded-[12px] bg-foreground px-5 py-[17px] font-semibold text-canvas">
          {t("enterCloset")}
        </button>
      </section>
    );
  }

  return (
    <section className="mb-5" aria-label={t("progressLabel")}>
      <div className="flex items-baseline justify-between gap-3" aria-live="polite">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          {t("photoProgress", { index: (batch.currentIndex ?? batch.total - 1) + 1, total: batch.total })}
        </p>
        <p className="text-xs text-muted-foreground">
          {batch.currentIndex === batch.total - 1 ? t("lastPhoto") :
            batch.nextReady ? t("nextReady") : t("preparingNext")}
        </p>
      </div>
      {batch.capacityMessage && (
        <p className="mt-3 text-sm text-muted-foreground">{batch.capacityMessage}</p>
      )}
      {batch.currentStage === "failed" && (
        <div className="mt-5">
          <p role="alert" className="text-sm text-brand-high">{error ?? t("preparationFailed")}</p>
          <div className="mt-3 flex gap-3">
            <button type="button" onClick={onRetry}
              className="min-h-11 flex-1 rounded-[12px] bg-foreground px-4 text-sm font-semibold text-canvas">
              {t("retryPhoto")}
            </button>
            <button type="button" onClick={onSkip}
              className="min-h-11 flex-1 rounded-[12px] border border-[--input] px-4 text-sm text-foreground">
              {t("skipPhoto")}
            </button>
          </div>
        </div>
      )}
      <button type="button" onClick={onFinish} disabled={saving}
        className="mt-5 min-h-11 text-sm text-muted-foreground underline underline-offset-4 disabled:opacity-60">
        {t("finishBatch")}
      </button>
      <p className="text-xs text-muted-foreground">
        {t("waitingHint")}
      </p>
    </section>
  );
}
