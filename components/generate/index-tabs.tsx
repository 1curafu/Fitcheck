"use client";

import { cn } from "@/lib/utils";

export function IndexTabs({
  names,
  selected,
  onSelect,
}: {
  names: string[];
  selected: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div role="tablist" className="flex gap-4 border-b border-[rgba(237,230,216,0.07)]">
      {names.map((name, i) => {
        const active = i === selected;
        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(i)}
            className={cn(
              "relative pb-[9px] text-left font-serif transition-colors",
              active ? "text-foreground" : "text-muted-foreground", // D2: inactive is muted-foreground, NOT faint
            )}
          >
            <span className="text-[15px] tabular-nums">{String(i + 1).padStart(2, "0")}</span>
            <span className="mt-0.5 block font-sans text-[9.5px] uppercase tracking-[0.14em]">{name}</span>
            {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded bg-brand" />}
          </button>
        );
      })}
    </div>
  );
}
