"use client";

import { Chip } from "@/components/ui-fitcheck/chip";
import type { UiOccasion } from "@/lib/generator/types";

const OCCASIONS: { key: UiOccasion; label: string }[] = [
  { key: "everyday", label: "Everyday" },
  { key: "work", label: "Work" },
  { key: "weekend", label: "Weekend" },
  { key: "evening", label: "Evening" },
];

export function OccasionRow({
  occasion,
  onOccasion,
  onRefine,
}: {
  occasion: UiOccasion;
  onOccasion: (o: UiOccasion) => void;
  onRefine: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-2 overflow-x-auto pb-1 [mask-image:linear-gradient(90deg,#000_92%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {OCCASIONS.map((o) => (
          <Chip
            key={o.key}
            variant="select"
            active={occasion === o.key}
            onClick={() => onOccasion(o.key)}
          >
            {o.label}
          </Chip>
        ))}
      </div>
      <button
        type="button"
        onClick={onRefine}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[rgba(237,230,216,0.12)] bg-surface-1 px-3 py-2 text-[11.5px] text-muted-foreground"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
        </svg>
        Refine
      </button>
    </div>
  );
}
