"use client";

import { useState } from "react";
import { COLORS, type ColorName } from "@/lib/closet/vocab";

/**
 * Colour was the one AI tag the user could never correct — and it feeds
 * `colorHarmonyScore` directly, so a mis-read colour quietly degrades every
 * outfit the generator ranks. The design shows colour as a hex swatch beside a
 * name (Fitcheck.dc.html:548-560); this is that control, made multi-select
 * because the schema stores up to three.
 *
 * COLLAPSED BY DEFAULT. Twenty-one swatches laid out flat ran to three rows and
 * pushed the rest of the form off the screen — the same problem the material
 * and texture selects solve. Editing a colour is rare (the tagger is usually
 * right); reading one is common. So the resting state is a single row that
 * SHOWS the answer, and the palette appears only when you go to change it.
 *
 * It opens automatically when nothing is selected, because then there is
 * nothing to summarise and the control would otherwise look broken.
 */
export function ColorPicker({
  value,
  onChange,
  max = 3,
}: {
  value: ColorName[];
  onChange: (next: ColorName[]) => void;
  max?: number;
}) {
  const [open, setOpen] = useState(value.length === 0);

  function toggle(name: ColorName) {
    if (value.includes(name)) {
      onChange(value.filter((c) => c !== name));
      return;
    }
    if (value.length >= max) return; // the cap mirrors TagSchema.colors.max(3)
    onChange([...value, name]);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Hide colour palette" : "Choose colours"}
        className="flex w-full items-center gap-3 rounded-[12px] border border-[--input] bg-surface-1 px-4 py-3 text-left text-sm text-foreground outline-none focus:border-brand"
      >
        <span className="flex gap-1.5">
          {value.map((name) => (
            <span
              key={name}
              // A stronger ring than the palette below: at 20px a near-black
              // swatch (#141414) on the surface (#161517) reads as an empty box
              // without a defined edge.
              className="size-5 rounded-[6px] shadow-[inset_0_0_0_1px_rgba(237,230,216,0.28)]"
              style={{ background: COLORS.find((c) => c.name === name)?.hex }}
            />
          ))}
        </span>
        <span className={value.length ? "text-value" : "text-muted-dim"}>
          {value.length ? value.join(" · ") : "Choose colours"}
        </span>
        <span aria-hidden className="ml-auto text-muted-dim">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && (
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => {
            const active = value.includes(c.name);
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => toggle(c.name)}
                aria-label={c.name}
                aria-pressed={active}
                title={c.name}
                // `--color-brand`, not `--brand`: Tailwind v4's `@theme` names
                // the token `--color-*`, and an undefined var would render no
                // ring at all — leaving the selected state invisible.
                className={`size-8 rounded-[9px] transition-transform ${
                  active
                    ? "scale-105 shadow-[0_0_0_2px_var(--color-brand)]"
                    : "shadow-[inset_0_0_0_1px_rgba(237,230,216,0.18)]"
                }`}
                style={{ background: c.hex }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
