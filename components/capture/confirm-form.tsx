"use client";

import { Chip } from "@/components/ui-fitcheck/chip";
import { Kicker } from "@/components/ui-fitcheck/kicker";
import type { Draft } from "./use-capture";
import type { Tags } from "@/lib/ai/tagging-schema";

import { ColorPicker } from "@/components/closet/color-picker";
import {
  CATEGORIES,
  SEASONS,
  FORMALITY_LABEL,
  MATERIALS,
  TEXTURES,
  PATTERNS,
} from "@/lib/closet/vocab";

// CATEGORIES is derived from TagSchema, so it includes Fragrance. A fragrance
// is never captured through this flow (and D11 keeps it out of outfits), so the
// picker offers the five wearable families — while the vocabulary itself stays
// the single source.
const PICKABLE = CATEGORIES.filter((c) => c !== "Fragrance");

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
        <Kicker className="mb-1 block text-brand">AI detected</Kicker>
        <p className="font-serif text-2xl text-foreground">{draft.tags.subcategory}</p>
      </div>

      <div>
        <Kicker className="mb-2 block">Subcategory</Kicker>
        <input
          aria-label="Subcategory"
          value={draft.tags.subcategory}
          onChange={(e) => onTags({ subcategory: e.target.value })}
          className="w-full rounded-[12px] border border-[--input] bg-surface-1 px-4 py-3 text-sm text-foreground outline-none focus:border-brand"
        />
      </div>

      <div>
        <Kicker className="mb-2 block">Colour</Kicker>
        <ColorPicker value={draft.tags.colors} onChange={(colors) => onTags({ colors })} />
      </div>

      <div>
        <Kicker className="mb-2 block">Texture</Kicker>
        <div className="flex flex-wrap gap-2">
          {TEXTURES.map((t) => (
            <Chip
              key={t}
              variant="select"
              active={draft.tags.texture === t}
              onClick={() => onTags({ texture: t })}
            >
              {t}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <Kicker className="mb-2 block">Pattern</Kicker>
        <div className="flex flex-wrap gap-2">
          {PATTERNS.map((p) => (
            <Chip
              key={p}
              variant="select"
              active={draft.tags.pattern === p}
              onClick={() => onTags({ pattern: p })}
            >
              {p}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <Kicker className="mb-2 block">Category</Kicker>
        <div className="flex flex-wrap gap-2">
          {PICKABLE.map((c) => (
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
        {/* A chip row, not a free-text input: `material` is a constrained enum
            now, so anything typed outside the vocabulary would fail
            TagSchema.parse at save time — after the user had already typed it. */}
        <div className="flex flex-wrap gap-2">
          {MATERIALS.map((m) => (
            <Chip
              key={m}
              variant="select"
              active={draft.tags.material === m}
              onClick={() => onTags({ material: m })}
            >
              {m}
            </Chip>
          ))}
        </div>
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
