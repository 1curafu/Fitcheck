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
  COLORS,
  COLOR_NAMES,
  FIT_OPTIONS,
  BRANDING_OPTIONS,
  LENGTH_OPTIONS,
  BULK_OPTIONS,
  DISTRESSING_OPTIONS,
  type ColorName,
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
  // Narrowed at the boundary, not by loosening ColorPicker: the DB column is
  // text[], so a row written before TagSchema.colors became an enum could still
  // hold a stray name. Anything off the palette is dropped rather than offered
  // back for re-saving.
  const [colors, setColors] = useState<ColorName[]>(
    item.colors.filter((c): c is ColorName => (COLOR_NAMES as readonly string[]).includes(c)),
  );
  const [texture, setTexture] = useState(item.texture ?? "Flat");
  const [pattern, setPattern] = useState(item.pattern ?? "solid");
  const [subcategory, setSubcategory] = useState(item.subcategory ?? "");
  const [price, setPrice] = useState(item.price?.toString() ?? "");
  const [fit, setFit] = useState<Tags["fit"]>(item.fit ?? null);
  const [branding, setBranding] = useState<Tags["branding"]>(item.branding ?? null);
  const [length, setLength] = useState<Tags["length"]>(item.length ?? null);
  const [bulk, setBulk] = useState<Tags["bulk"]>(item.bulk ?? null);
  const [distressing, setDistressing] = useState<Tags["distressing"]>(item.distressing ?? null);
  // Narrowed at the boundary, same reason as `colors` above.
  const [accentColor, setAccentColor] = useState<ColorName | null>(
    item.accent_color && (COLOR_NAMES as readonly string[]).includes(item.accent_color)
      ? (item.accent_color as ColorName)
      : null,
  );
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
          fit,
          branding,
          accent_color: accentColor,
          length,
          // Sole is meaningless off a shoe — an always-visible control invites a
          // value that would then make `proportion` reason about a sole on a
          // knit, so a non-Shoes category never persists one, even if it was
          // set before the category was changed on this same save.
          bulk: category === "Shoes" ? bulk : null,
          distressing,
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
            <Kicker className="mb-2 block">Fit</Kicker>
            {/* Same chip treatment as the confirm screen, but with ONE
                deliberate divergence: these chips toggle off. `fit` is nullable
                and is treated as the USER's answer, not the model's — a later
                plan gates its proportion rules on what fraction of items have a
                real value here, so an accidental tap must be undoable back to
                "I don't know" rather than silently promoted to a fact. The
                confirm screen does not need this: it pre-selects the model's
                draft, so its chips are a correction affordance over an
                always-present value, never a way to express "unset". */}
            <div role="group" aria-label="Fit" className="flex flex-wrap gap-2">
              {FIT_OPTIONS.map((f) => (
                <Chip
                  key={f}
                  variant="select"
                  active={fit === f}
                  onClick={() => setFit(fit === f ? null : f)}
                >
                  {f}
                </Chip>
              ))}
            </div>
          </div>

          {category === "Shoes" && (
            <div>
              <Kicker className="mb-2 block">Sole</Kicker>
              {/* ⚠️ Only rendered for Shoes — an always-visible control invites a
                  value that would make `proportion` reason about a sole on a
                  knit. */}
              <Select
                aria-label="Sole"
                value={bulk ?? ""}
                onChange={(e) => setBulk((e.target.value || null) as Tags["bulk"])}
              >
                <option value="">Not set</option>
                {BULK_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </div>
          )}

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
            <Kicker className="mb-2 block">Accent colour</Kicker>
            {/* A SMALL contrast colour — a logo, a sole, contrast stitching —
                kept separate from `colors` so a two-tone sneaker does not spend
                the outfit's 3-colour ceiling. Single-select, unlike the
                multi-select palette above. */}
            <div role="group" aria-label="Accent colour" className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAccentColor(null)}
                aria-pressed={accentColor === null}
                className={`rounded-full px-[13px] py-2 text-xs font-medium transition-colors ${
                  accentColor === null
                    ? "border border-brand/50 bg-brand/15 text-brand-high"
                    : "border border-[--input] bg-surface-1 text-muted-foreground"
                }`}
              >
                None
              </button>
              {COLORS.map((c) => {
                const active = accentColor === c.name;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setAccentColor(active ? null : c.name)}
                    aria-label={c.name}
                    aria-pressed={active}
                    title={c.name}
                    className={`size-7 rounded-[8px] transition-transform ${
                      active
                        ? "scale-105 shadow-[0_0_0_2px_var(--color-brand)]"
                        : "shadow-[inset_0_0_0_1px_rgba(237,230,216,0.18)]"
                    }`}
                    style={{ background: c.hex }}
                  />
                );
              })}
            </div>
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
            <Kicker className="mb-2 block">Branding</Kicker>
            <Select
              aria-label="Branding"
              value={branding ?? ""}
              onChange={(e) => setBranding((e.target.value || null) as Tags["branding"])}
            >
              <option value="">Not set</option>
              {BRANDING_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Kicker className="mb-2 block">Length</Kicker>
            <Select
              aria-label="Length"
              value={length ?? ""}
              onChange={(e) => setLength((e.target.value || null) as Tags["length"])}
            >
              <option value="">Not set</option>
              {LENGTH_OPTIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Kicker className="mb-2 block">Wear</Kicker>
            {/* User-facing label for `distressing`. AI-inferred at capture (rips
                and heavy fading are plainly visible in a cutout), so unlike Fit
                it never interrupts capture with a question — this is its only
                correction path.

                ⚠️ No "Not set" option here, unlike Branding/Length/Sole below —
                deliberately. `distressing` doubles as the backfill script's
                sentinel for "has this row been through the tagger" (see
                scripts/backfill-styling-tags.ts), and it already has a real
                value for "no wear": "None". Offering "Not set" would let a
                user re-arm the sentinel by accident, making an already-tagged
                row look never-processed again. Null is a genuine answer for
                Branding/Length/Sole (a photo may not show enough to tell);
                for Wear it never is — the tagger always resolves to
                None/Faded/Ripped. */}
            <Select
              aria-label="Wear"
              value={distressing ?? ""}
              onChange={(e) => setDistressing(e.target.value as Tags["distressing"])}
            >
              {DISTRESSING_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
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
