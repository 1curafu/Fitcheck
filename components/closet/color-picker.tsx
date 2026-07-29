"use client";

import { COLORS } from "@/lib/closet/vocab";

/**
 * Colour was the one AI tag the user could never correct — and it feeds
 * `colorHarmonyScore` directly, so a mis-read colour quietly degrades every
 * outfit the generator ranks. The design shows colour as a hex swatch beside a
 * name (Fitcheck.dc.html:548-560); this is that control, made multi-select
 * because the schema stores up to three.
 */
export function ColorPicker({
  value,
  onChange,
  max = 3,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
}) {
  function toggle(name: string) {
    if (value.includes(name)) {
      onChange(value.filter((c) => c !== name));
      return;
    }
    if (value.length >= max) return; // the cap mirrors TagSchema.colors.max(3)
    onChange([...value, name]);
  }

  return (
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
            // `--color-brand`, not `--brand`: Tailwind v4's `@theme` names the
            // token `--color-*`, and an undefined var would render no ring at
            // all — leaving the selected state invisible.
            className={`size-9 rounded-[10px] transition-transform ${
              active
                ? "scale-105 shadow-[0_0_0_2px_var(--color-brand)]"
                : "shadow-[inset_0_0_0_1px_rgba(237,230,216,0.12)]"
            }`}
            style={{ background: c.hex }}
          />
        );
      })}
    </div>
  );
}
