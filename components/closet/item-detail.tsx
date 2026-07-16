"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateItem, archiveItem } from "@/app/closet/[itemId]/actions";
import { Chip } from "@/components/ui-fitcheck/chip";
import { Kicker } from "@/components/ui-fitcheck/kicker";
import type { Tags } from "@/lib/ai/tagging-schema";

const CATEGORIES: Tags["category"][] = ["Tops", "Bottoms", "Outerwear", "Shoes", "Accessories"];
const SEASONS: Tags["seasons"][number][] = ["Spring", "Summer", "Autumn", "Winter"];
const FORMALITY_LABEL = ["", "Very casual", "Casual", "Smart casual", "Business", "Formal"];
const MATERIALS = [
  "Cotton", "Wool", "Linen", "Denim", "Leather", "Suede", "Cashmere", "Silk",
  "Polyester", "Nylon", "Stainless steel", "Gold", "Silver", "Canvas",
];

export type DetailItem = {
  id: string;
  name: string | null;
  brand: string | null;
  category: Tags["category"];
  subcategory: string | null;
  colors: string[];
  material: string | null;
  formality: number | null;
  seasons: string[];
};

export function ItemDetail({
  item,
  imageUrl,
  brandSuggestions,
}: {
  item: DetailItem;
  imageUrl: string;
  brandSuggestions: string[];
}) {
  const router = useRouter();
  const [name, setName] = useState(item.name ?? "");
  const [brand, setBrand] = useState(item.brand ?? "");
  const [material, setMaterial] = useState(item.material ?? "");
  const [category, setCategory] = useState<Tags["category"]>(item.category);
  const [formality, setFormality] = useState(item.formality ?? 3);
  const [seasons, setSeasons] = useState<string[]>(item.seasons);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
          material: material || "Unknown",
          formality,
          seasons: seasons.length ? seasons : ["Spring"],
        });
        router.push("/closet");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  function remove() {
    if (!confirm("Remove this piece from your closet?")) return;
    setError(null);
    start(async () => {
      try {
        await archiveItem(item.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to remove");
      }
    });
  }

  return (
    <main className="flex flex-1 flex-col gap-5 px-6 pb-7 pt-12">
      <button
        onClick={() => router.back()}
        className="self-start text-2xl leading-none text-muted-foreground"
        aria-label="Back"
      >
        ‹
      </button>

      <div className="grid aspect-[1.3] place-items-center rounded-[18px] bg-surface-1 shadow-[inset_0_0_0_1px_rgba(237,230,216,0.07)]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name} className="size-full object-contain p-6" />
        ) : null}
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="rounded-[12px] border border-[--input] bg-surface-1 px-4 py-3 font-serif text-lg text-foreground outline-none focus:border-brand"
      />

      <input
        list="brand-suggestions"
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
          {CATEGORIES.map((c) => (
            <Chip key={c} variant="select" active={category === c} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <Kicker className="mb-2 block">Material</Kicker>
        <input
          list="material-suggestions"
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          placeholder="e.g. Stainless steel, Wool, Leather"
          className="w-full rounded-[12px] border border-[--input] bg-surface-1 px-4 py-3 text-sm text-foreground outline-none focus:border-brand"
        />
        <datalist id="material-suggestions">
          {MATERIALS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
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
            <Chip key={s} variant="select" active={seasons.includes(s)} onClick={() => toggleSeason(s)}>
              {s}
            </Chip>
          ))}
        </div>
      </div>

      {item.colors.length > 0 && (
        <p className="text-xs text-muted-dim">Colours: {item.colors.join(" · ")}</p>
      )}
      {error && <p className="text-sm text-brand">{error}</p>}

      <div className="flex-1" />
      <button
        onClick={save}
        disabled={pending}
        className="rounded-[12px] bg-foreground py-[17px] text-center font-semibold text-canvas disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      <button
        onClick={remove}
        disabled={pending}
        className="text-center text-sm text-brand-deep"
      >
        Remove from closet
      </button>
    </main>
  );
}
