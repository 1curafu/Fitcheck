"use client";

import { Chip } from "@/components/ui-fitcheck/chip";
import { Kicker } from "@/components/ui-fitcheck/kicker";
import type { Draft } from "./use-capture";
import type { Tags } from "@/lib/ai/tagging-schema";

const CATEGORIES: Tags["category"][] = ["Tops", "Bottoms", "Outerwear", "Shoes", "Accessories"];
const SEASONS: Tags["seasons"][number][] = ["Spring", "Summer", "Autumn", "Winter"];
const FORMALITY_LABEL = ["", "Very casual", "Casual", "Smart casual", "Business", "Formal"];
const MATERIALS = [
  "Cotton", "Wool", "Linen", "Denim", "Leather", "Suede", "Cashmere", "Silk",
  "Polyester", "Nylon", "Stainless steel", "Gold", "Silver", "Canvas",
];

export function ConfirmForm({
  draft,
  saving,
  error,
  onDraft,
  onTags,
  onToggleSeason,
  onSave,
}: {
  draft: Draft;
  saving: boolean;
  error: string | null;
  onDraft: (patch: Partial<Draft>) => void;
  onTags: (patch: Partial<Tags>) => void;
  onToggleSeason: (s: Tags["seasons"][number]) => void;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="grid aspect-[1.3] place-items-center rounded-[18px] bg-surface-1 shadow-[inset_0_0_0_1px_rgba(237,230,216,0.07)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={draft.cutoutUrl} alt="" className="size-full object-contain p-6" />
      </div>

      <input
        value={draft.name}
        onChange={(e) => onDraft({ name: e.target.value })}
        placeholder="Name"
        className="rounded-[12px] border border-[--input] bg-surface-1 px-4 py-3 font-serif text-lg text-foreground outline-none focus:border-brand"
      />
      <input
        value={draft.brand}
        onChange={(e) => onDraft({ brand: e.target.value })}
        placeholder="Brand (optional)"
        className="-mt-2 rounded-[12px] border border-[--input] bg-surface-1 px-4 py-3 text-sm text-foreground outline-none focus:border-brand"
      />

      <div>
        <Kicker className="mb-2 block">Category</Kicker>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              variant="select"
              active={draft.tags.category === c}
              onClick={() => onTags({ category: c })}
            >
              {c}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <Kicker className="mb-2 block">Material</Kicker>
        <input
          list="cap-materials"
          value={draft.tags.material}
          onChange={(e) => onTags({ material: e.target.value })}
          placeholder="e.g. Stainless steel, Wool, Leather"
          className="w-full rounded-[12px] border border-[--input] bg-surface-1 px-4 py-3 text-sm text-foreground outline-none focus:border-brand"
        />
        <datalist id="cap-materials">
          {MATERIALS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>

      <div>
        <Kicker className="mb-2 block">
          Formality · {FORMALITY_LABEL[draft.tags.formality]}
        </Kicker>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onTags({ formality: n })}
              aria-label={`Formality ${n}`}
              aria-pressed={draft.tags.formality === n}
              className={`h-11 flex-1 rounded-[10px] text-sm font-medium transition-colors ${
                n <= draft.tags.formality
                  ? "border border-brand/50 bg-brand/15 text-brand-high"
                  : "border border-[--input] bg-surface-1 text-muted-foreground"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Kicker className="mb-2 block">Seasons</Kicker>
        <div className="flex flex-wrap gap-2">
          {SEASONS.map((s) => (
            <Chip
              key={s}
              variant="select"
              active={draft.tags.seasons.includes(s)}
              onClick={() => onToggleSeason(s)}
            >
              {s}
            </Chip>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-dim">
        We&apos;re ~90% right — fix anything that&apos;s off.
      </p>
      {error && <p className="text-sm text-brand">{error}</p>}
      <div className="flex-1" />
      <button
        onClick={onSave}
        disabled={saving}
        className="rounded-[12px] bg-foreground py-[17px] text-center font-semibold text-canvas disabled:opacity-60"
      >
        {saving ? "Saving…" : "Add to closet"}
      </button>
    </div>
  );
}
