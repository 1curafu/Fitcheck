"use client";

import { useTranslations } from "next-intl";
import { Chip } from "@/components/ui-fitcheck/chip";
import type { UiOccasion } from "@/lib/generator/types";

const OCCASIONS: UiOccasion[] = ["everyday", "work", "weekend", "evening"];

/**
 * One-from-four selector. All four occasions must be visible without scrolling:
 * measured on a 390px iPhone, the old scrolling row (with Refine inside it) put
 * "Evening" 100% off-screen, so a quarter of the feature was undiscoverable.
 * Refine now lives in the header — it's a modifier applied on top of the chosen
 * occasion, not a fifth peer of it.
 */
export function OccasionRow({
  occasion,
  onOccasion,
}: {
  occasion: UiOccasion;
  onOccasion: (o: UiOccasion) => void;
}) {
  const t = useTranslations("vocab.occasion");
  return (
    <div className="flex gap-2">
      {OCCASIONS.map((o) => (
        <Chip
          key={o}
          variant="select"
          active={occasion === o}
          onClick={() => onOccasion(o)}
          className="flex-1 px-0 text-[13px]"
        >
          {t(o)}
        </Chip>
      ))}
    </div>
  );
}

/** The Refine trigger, now a header action rather than a chip in the row. */
export function RefineButton({ onRefine }: { onRefine: () => void }) {
  const t = useTranslations("generate.refine");
  return (
    <button
      type="button"
      onClick={onRefine}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[rgba(237,230,216,0.12)] bg-surface-1 px-3 py-2 text-[11.5px] text-muted-foreground"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
      </svg>
      {t("button")}
    </button>
  );
}
