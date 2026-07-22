"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Each swatch is a colour FAMILY, and every `id` here must be a key of
 * `COLOR_FAMILIES` in `lib/generator/color.ts` — that is what turns a swatch
 * into the set of tag words Haiku actually writes ("charcoal", "khaki", …).
 * Matching these ids against item colours literally is what made the picker
 * return nothing.
 */
const PALETTE = [
  { id: "neutral", hex: "#8C8578" },
  { id: "camel", hex: "#C6A374" },
  { id: "navy", hex: "#2C3A4C" },
  { id: "olive", hex: "#6E6F52" },
  { id: "dark", hex: "#2B2A2E" },
];

export function RefineSheet({
  open,
  occasionLabel,
  onApply,
  onClose,
}: {
  open: boolean;
  occasionLabel: string;
  onApply: (r: { formality: number; lean: string[] }) => void;
  onClose: () => void;
}) {
  const [formality, setFormality] = useState(3);
  const [colors, setColors] = useState<string[]>([]);
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 z-30 bg-[rgba(6,6,8,0.5)] backdrop-blur-[1.5px]"
      />
      <div
        role="dialog"
        aria-label="Refine the looks"
        className="absolute inset-x-0 bottom-0 z-40 rounded-t-[22px] border-t border-[rgba(237,230,216,0.12)] bg-surface-2 px-[18px] pb-5 pt-3.5"
      >
        <div className="mx-auto mb-3 h-1 w-[34px] rounded-full bg-faint" />
        <h4 className="font-serif text-[19px] text-foreground">Refine the looks</h4>
        <p className="mb-4 text-xs text-muted-dim">Dressing for {occasionLabel} — nudge the rest.</p>

        <p className="mb-2 text-[9px] uppercase tracking-[0.16em] text-muted-dim">Formality</p>
        <div className="flex gap-[5px]">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={formality === n}
              onClick={() => setFormality(n)}
              className={cn(
                "h-8 flex-1 rounded-[9px] border text-xs transition-colors",
                formality === n
                  ? "border-brand/50 bg-brand/15 font-semibold text-brand-high"
                  : "border-[rgba(237,230,216,0.12)] text-muted-foreground",
              )}
            >
              {n}
            </button>
          ))}
        </div>

        <p className="mb-2 mt-[15px] text-[9px] uppercase tracking-[0.16em] text-muted-dim">Lean into</p>
        <div className="flex gap-2.5">
          {PALETTE.map((c) => {
            const on = colors.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-label={c.id}
                aria-pressed={on}
                onClick={() => setColors((cur) => (on ? cur.filter((x) => x !== c.id) : [...cur, c.id]))}
                style={{ background: c.hex }}
                className={cn(
                  "h-[30px] w-[30px] rounded-full ring-inset",
                  on ? "ring-2 ring-brand" : "ring-1 ring-[rgba(237,230,216,0.12)]",
                )}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onApply({ formality, lean: colors })}
          className="mt-[18px] w-full rounded-[12px] bg-foreground py-3.5 text-sm font-semibold text-canvas"
        >
          Show 3 looks
        </button>
      </div>
    </>
  );
}
