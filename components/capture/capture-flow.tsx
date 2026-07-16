"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { processImage, blobToBase64 } from "@/lib/images/process";
import { uploadAndTag, confirmItem } from "@/app/closet/upload/actions";
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

type Draft = {
  imagePath: string;
  cutoutPath: string;
  cutoutUrl: string;
  name: string;
  brand: string;
  tags: Tags;
};

export function CaptureFlow() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"aim" | "removing" | "confirm">("aim");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Free the object URL when it's replaced by a new capture or on unmount,
  // so repeated captures don't leak blob URLs.
  useEffect(() => {
    const url = draft?.cutoutUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [draft?.cutoutUrl]);

  async function onFile(file: File) {
    setError(null);
    setPhase("removing");
    try {
      const { original, cutout } = await processImage(file);
      const [originalB64, cutoutB64] = await Promise.all([
        blobToBase64(original),
        blobToBase64(cutout),
      ]);
      const res = await uploadAndTag({ originalB64, cutoutB64, mediaType: "image/png" });
      setDraft({
        imagePath: res.imagePath,
        cutoutPath: res.cutoutPath,
        cutoutUrl: URL.createObjectURL(cutout),
        name: res.tags.subcategory,
        brand: "",
        tags: res.tags,
      });
      setPhase("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Capture failed");
      setPhase("aim");
    }
  }

  function toggleSeason(s: Tags["seasons"][number]) {
    setDraft((d) => {
      if (!d) return d;
      const cur = d.tags.seasons;
      const next = cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s];
      return next.length ? { ...d, tags: { ...d.tags, seasons: next } } : d;
    });
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      await confirmItem({
        imagePath: draft.imagePath,
        cutoutPath: draft.cutoutPath,
        name: draft.name || null,
        brand: draft.brand || null,
        tags: draft.tags,
      });
      router.push("/closet");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col px-6 pb-7 pt-12">
      {/* No `capture` attribute → phones offer Photo Library / Take Photo /
          Choose File, so the user can upload an existing photo or shoot a new one. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
        }}
      />

      {phase !== "confirm" && (
        <>
          <Kicker className="mb-[10px] block">Add a piece</Kicker>
          <h1 className="mb-6 font-serif text-3xl/[1.12] text-foreground">
            Capture an item.
          </h1>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={phase === "removing"}
            className="relative aspect-[1.15] overflow-hidden rounded-[18px] bg-[radial-gradient(120%_120%_at_50%_30%,#1b1a1d_0%,#121113_100%)] shadow-[inset_0_0_0_1px_rgba(237,230,216,0.07)]"
          >
            <span className="absolute left-[18px] top-[18px] size-[26px] rounded-tl-[6px] border-l-2 border-t-2 border-foreground/40" />
            <span className="absolute right-[18px] top-[18px] size-[26px] rounded-tr-[6px] border-r-2 border-t-2 border-foreground/40" />
            <span className="absolute bottom-[18px] left-[18px] size-[26px] rounded-bl-[6px] border-b-2 border-l-2 border-foreground/40" />
            <span className="absolute bottom-[18px] right-[18px] size-[26px] rounded-br-[6px] border-b-2 border-r-2 border-foreground/40" />
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-dim">
              {phase === "removing" ? (
                <>
                  <span className="size-9 animate-spin rounded-full border-2 border-foreground/15 border-t-brand" />
                  <span className="text-[13px]">Cutting out &amp; reading colours…</span>
                </>
              ) : (
                <>
                  <span className="grid size-14 place-items-center rounded-full border border-foreground/20">
                    <span className="size-8 rounded-full bg-brand" />
                  </span>
                  <span className="text-[13px]">Tap to capture an item</span>
                </>
              )}
            </span>
          </button>
          <p className="mt-6 text-sm text-muted-foreground">
            Snap each piece on a flat surface. We cut it out and learn its colour, fabric and formality.
          </p>
          {error && <p className="mt-4 text-sm text-brand">{error}</p>}
        </>
      )}

      {phase === "confirm" && draft && (
        <div className="flex flex-1 flex-col gap-5">
          <div className="grid aspect-[1.3] place-items-center rounded-[18px] bg-surface-1 shadow-[inset_0_0_0_1px_rgba(237,230,216,0.07)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={draft.cutoutUrl} alt="" className="size-full object-contain p-6" />
          </div>

          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Name"
            className="rounded-[12px] border border-[--input] bg-surface-1 px-4 py-3 font-serif text-lg text-foreground outline-none focus:border-brand"
          />
          <input
            value={draft.brand}
            onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
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
                  onClick={() => setDraft({ ...draft, tags: { ...draft.tags, category: c } })}
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
              onChange={(e) =>
                setDraft({ ...draft, tags: { ...draft.tags, material: e.target.value } })
              }
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
                  onClick={() => setDraft({ ...draft, tags: { ...draft.tags, formality: n } })}
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
                  onClick={() => toggleSeason(s)}
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
            onClick={() => void save()}
            disabled={saving}
            className="rounded-[12px] bg-foreground py-[17px] text-center font-semibold text-canvas disabled:opacity-60"
          >
            {saving ? "Saving…" : "Add to closet"}
          </button>
        </div>
      )}
    </main>
  );
}
