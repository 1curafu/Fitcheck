"use client";

import { useEffect, useRef } from "react";

export type SavedSlotImage = { src: string | null; name: string };

export function ProgressStrip({ filled, images = [], total = 5 }: {
  filled: number;
  images?: SavedSlotImage[];
  total?: number;
}) {
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || filled < 1) return;
    const saved = strip.querySelectorAll<HTMLElement>('[data-filled="true"]');
    const newest = saved.item(saved.length - 1);
    if (!newest) return;
    const overflow = newest.getBoundingClientRect().right - strip.getBoundingClientRect().right;
    if (overflow > 0) strip.scrollLeft += overflow + 10;
  }, [filled]);

  return (
    <div ref={stripRef} className="mb-4 mt-6 overflow-x-auto">
      <div className="mx-auto flex w-max min-w-full justify-center gap-[10px]">
        {Array.from({ length: total }, (_, i) => {
          const isFilled = i < filled;
          const image = isFilled ? images[i] : null;
          return (
            <div
              key={i}
              data-filled={isFilled}
              className={`flex size-[54px] shrink-0 items-center justify-center overflow-hidden rounded-[11px] border transition-all duration-300 ${
                isFilled
                  ? "border-brand/40 bg-foreground/75"
                  : "border-foreground/[0.07] bg-[#141315]"
              }`}
            >
              {image?.src ? (
                // Private signed URLs and local blob URLs are already sized for this small tile.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image.src} alt={image.name} className="block size-full object-contain p-1" />
              ) : !isFilled ? (
                <span className="text-[13px] text-[#3b3a3d]">{i + 1}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
