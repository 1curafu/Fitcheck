"use client";

import { Chip } from "@/components/ui-fitcheck/chip";
import { Kicker } from "@/components/ui-fitcheck/kicker";
import { Select } from "@/components/ui-fitcheck/select";
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
      {/* `.surface-stage` is the design's cutout stage (Fitcheck.dc.html:595 /
          :530) — a radial gradient lit from above, not a flat fill.
          The image is ABSOLUTELY positioned, not a grid item: as a grid
          item its `min-height:auto` forced the row past the 1.3 aspect ratio,
          and `max-h-full` could not save it because a percentage against an
          auto-sized row is indefinite and resolves to `none` — so a 970x1280
          cutout spilled over the fields below. Absolute + inset-0 gives
          object-contain a definite box to fit inside. */}
      <div className="relative aspect-[1.3] overflow-hidden rounded-[18px] surface-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={draft.cutoutUrl} alt="" className="absolute inset-0 size-full object-contain p-6" />
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
        <Select
          aria-label="Texture"
          value={draft.tags.texture}
          onChange={(e) => onTags({ texture: e.target.value as Tags["texture"] })}
        >
          {TEXTURES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Kicker className="mb-2 block">Pattern</Kicker>
        <Select
          aria-label="Pattern"
          value={draft.tags.pattern}
          onChange={(e) => onTags({ pattern: e.target.value as Tags["pattern"] })}
        >
          {PATTERNS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
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
        {/* A select, not free text and not chips: `material` is a constrained
            enum, so typed input would fail TagSchema.parse at save time — and
            27 chips ran to eight rows on a phone. */}
        <Select
          aria-label="Material"
          value={draft.tags.material}
          onChange={(e) => onTags({ material: e.target.value as Tags["material"] })}
        >
          {MATERIALS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
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
