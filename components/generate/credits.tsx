"use client";

import type { LookPiece } from "@/lib/generator/types";

// Magazine credit line (README §8). D2 reversal: brand names are the MOST readable
// (foreground, semibold), garment words muted-foreground, separators muted-dim.

export function Credits({
  pieces,
  onOpenItem,
}: {
  pieces: LookPiece[];
  onOpenItem: (itemId: string) => void;
}) {
  return (
    <p className="mt-[13px] border-t border-[rgba(237,230,216,0.07)] pt-[11px] text-[10px] uppercase leading-[1.8] tracking-[0.13em]">
      {pieces.map((p, i) => (
        <span key={p.itemId}>
          {i > 0 && <span className="text-muted-dim"> · </span>}
          <button
            type="button"
            onClick={() => onOpenItem(p.itemId)}
            className="inline min-h-11 text-muted-foreground hover:text-foreground"
          >
            {p.brand && <b className="font-semibold text-foreground">{p.brand} </b>}
            {p.name ?? p.subcategory ?? p.category}
          </button>
        </span>
      ))}
    </p>
  );
}
