"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateItem } from "@/app/closet/[itemId]/actions";
import { Chip } from "@/components/ui-fitcheck/chip";
import { Kicker } from "@/components/ui-fitcheck/kicker";
import { Select } from "@/components/ui-fitcheck/select";
import type { Tags } from "@/lib/ai/tagging-schema";

import { ColorPicker } from "./color-picker";
import type { DetailItem } from "./item-detail";
import {
  CATEGORIES,
  SEASONS,
  FORMALITY_LABEL,
  MATERIALS,
  TEXTURES,
  PATTERNS,
} from "@/lib/closet/vocab";

// See the note in confirm-form.tsx — CATEGORIES carries Fragrance because it is
// derived from TagSchema; the picker offers the wearable families.
const PICKABLE = CATEGORIES.filter((c) => c !== "Fragrance");

/**
 * The tag form, MOVED here from item-detail.tsx unchanged.
 *
 * Item detail is read-first now (Fitcheck.dc.html:587-657) — it answers "how do
 * I actually wear this?". Editing is the rarer job, so it lives behind `⋯`.
 * The controls below are the ones the item-data-completeness plan settled
 * (constrained material/texture/pattern selects, the colour palette, price);
 * they were relocated, not rewritten, so none of those fixes are lost.
 */
export function ItemEditSheet({
  item,
  brandSuggestions,
  onClose,
}: {
  item: DetailItem;
  brandSuggestions: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(item.name ?? "");
  const [brand, setBrand] = useState(item.brand ?? "");
  const [material, setMaterial] = useState(item.material ?? "");
  const [category, setCategory] = useState<Tags["category"]>(item.category);
  const [formality, setFormality] = useState(item.formality ?? 3);
  const [seasons, setSeasons] = useState<string[]>(item.seasons);
  const [colors, setColors] = useState<string[]>(item.colors);
  const [texture, setTexture] = useState(item.texture ?? "Flat");
  const [pattern, setPattern] = useState(item.pattern ?? "solid");
  const [subcategory, setSubcategory] = useState(item.subcategory ?? "");
  const [price, setPrice] = useState(item.price?.toString() ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggleSeason(s: string) {
    setSeasons((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  function save() {
    setError(null);
    start(async () => {
      try {
        await updateItem(item.id, {
          name: name || null,
          brand: brand || null,
          category,
          // "Unknown" is not in the vocabulary — it was fabricated here and
          // would now fail validation. "Other" is the real escape hatch.
          material: material || "Other",
          subcategory: subcategory || null,
          colors,
          texture,
          pattern,
          // An empty box means "not recorded", not zero — cost-per-wear must
          // not divide by a price the user never gave.
          price: price.trim() === "" ? null : Number(price),
          formality,
          seasons: seasons.length ? seasons : ["Spring"],
        });
        // Back to the read view, refreshed — the tag rows and the stat tiles
        // are server-rendered, so they need a re-fetch, not a client update.
        onClose();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(8,8,10,0.6)] backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit piece"
        className="relative mx-auto flex max-h-[88dvh] w-full max-w-[440px] flex-col overflow-y-auto rounded-t-[22px] bg-canvas px-6 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-5 shadow-[inset_0_0_0_1px_var(--hairline-6)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl text-foreground">Edit piece</h2>
          <button type="button" onClick={onClose} className="text-sm text-muted-foreground">
            Cancel
          </button>
        </div>

        <div className="flex flex-col gap-5">
          <input
            aria-label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="rounded-[12px] border border-[--input] bg-surface-1 px-4 py-3 font-serif text-lg text-foreground outline-none focus:border-brand"
          />

          <input
            list="brand-suggestions"
            aria-label="Brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Brand (optional)"
            className="-mt-2 rounded-[12px] border border-[--input] bg-surface-1 px-4 py-3 text-sm text-foreground outline-none focus:border-brand"
          />
          <datalist id="brand-suggestions">
            {brandSuggestions.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>

          <div>
            <Kicker className="mb-2 block">Category</Kicker>
            <div className="flex flex-wrap gap-2">
              {PICKABLE.map((c) => (
                <Chip
                  key={c}
                  variant="select"
                  active={category === c}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <Kicker className="mb-2 block">Material</Kicker>
            {/* A select, not free text and not chips: `material` is a constrained
                enum, and 27 chips ran to eight rows on a phone. */}
            <Select aria-label="Material" value={material} onChange={(e) => setMaterial(e.target.value)}>
              {MATERIALS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Kicker className="mb-2 block">Formality · {FORMALITY_LABEL[formality]}</Kicker>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setFormality(n)}
                  className={`h-2 flex-1 rounded-full ${n <= formality ? "bg-brand" : "bg-foreground/10"}`}
                  aria-label={`Formality ${n}`}
                />
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
                  active={seasons.includes(s)}
                  onClick={() => toggleSeason(s)}
                >
                  {s}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <Kicker className="mb-2 block">Subcategory</Kicker>
            <input
              aria-label="Subcategory"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="w-full rounded-[12px] border border-[--input] bg-surface-1 px-4 py-3 text-sm text-foreground outline-none focus:border-brand"
            />
          </div>

          <div>
            <Kicker className="mb-2 block">Colour</Kicker>
            <ColorPicker value={colors} onChange={setColors} />
          </div>

          <div>
            <Kicker className="mb-2 block">Texture</Kicker>
            <Select aria-label="Texture" value={texture} onChange={(e) => setTexture(e.target.value)}>
              {TEXTURES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Kicker className="mb-2 block">Pattern</Kicker>
            <Select aria-label="Pattern" value={pattern} onChange={(e) => setPattern(e.target.value)}>
              {PATTERNS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Kicker className="mb-2 block">Price paid</Kicker>
            <input
              aria-label="Price paid"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Optional — enables cost per wear"
              className="w-full rounded-[12px] border border-[--input] bg-surface-1 px-4 py-3 text-sm text-foreground outline-none focus:border-brand"
            />
          </div>

          {error && <p className="text-sm text-brand">{error}</p>}

          <button
            onClick={save}
            disabled={pending}
            className="mt-1 rounded-[12px] bg-foreground py-[17px] text-center font-semibold text-canvas disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
