"use client";

import { useOptimistic, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { toggleWear, toggleFavorite } from "@/app/outfits/[id]/actions";
import { Kicker } from "@/components/ui-fitcheck/kicker";
import { wearLabel } from "@/lib/outfits/wear";
import type { Slot } from "@/lib/generator/types";

export type DetailPiece = {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  imageUrl: string;
  slot: Slot;
};

export function OutfitDetail({
  outfit,
  pieces,
  worn,
  favorite,
}: {
  outfit: {
    id: string;
    lookName: string;
    occasion: string;
    weatherLabel: string;
    reasoning: string | null;
  };
  pieces: DetailPiece[];
  worn: boolean;
  favorite: boolean;
}) {
  const router = useRouter();
  // Optimistic rather than local state: both toggles revalidate this route, so
  // the server value is the truth a moment later. `useState(worn)` would seed
  // once and then ignore it — the button would keep saying whatever the last tap
  // said even if the write failed.
  const [isWorn, showWorn] = useOptimistic(worn);
  const [isFav, showFav] = useOptimistic(favorite);
  const [pending, start] = useTransition();

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Back"
        className="absolute left-[18px] top-[58px] z-40 grid size-10 place-items-center rounded-full bg-[rgba(20,19,22,0.7)] text-xl text-foreground shadow-[inset_0_0_0_1px_var(--hairline-7)] backdrop-blur-[10px]"
      >
        ‹
      </button>

      <div className="flex-1 overflow-y-auto pb-[130px]">
        {/* :325 — a full-bleed stage, and the SAME stored geometry the stylist
            screen laid out, so tapping a look does not rearrange it. */}
        <div
          data-testid="detail-stage"
          className="relative h-[420px] [background:radial-gradient(120%_90%_at_50%_22%,#201f22_0%,#0E0E10_78%)]"
        >
          {pieces.map((p) => {
            const s = p.slot;
            const style: CSSProperties = {
              position: "absolute",
              left: `${s.xPct}%`,
              top: `${s.yPct}%`,
              width: `${s.wPct}%`,
              height: `${s.hPct}%`,
              zIndex: s.z,
              transform: `rotate(${s.rotationDeg}deg)`,
              filter: "drop-shadow(0 14px 18px rgba(0,0,0,.55))",
            };
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.imageUrl} alt={p.name} className="object-contain" style={style} />
            );
          })}
        </div>

        <div className="px-6 pt-2">
          <Kicker>
            {outfit.occasion} · {outfit.weatherLabel}
          </Kicker>
          <h1 className="mt-2 font-serif text-[34px]/[1.04] text-foreground">{outfit.lookName}</h1>

          {outfit.reasoning && (
            // The Italic Why Rule — the one sentence that is the product. The rust
            // "f" glyph is the One Rust Rule's spend on this screen.
            <div className="my-5 flex items-start gap-3 rounded-[14px] bg-gradient-to-br from-[#201b18] to-[#191518] p-[18px] shadow-[inset_0_0_0_1px_rgba(184,106,71,0.2)]">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand font-serif text-base italic text-canvas">
                f
              </span>
              <p className="font-serif text-lg/[1.45] italic text-value text-pretty">
                &ldquo;{outfit.reasoning}&rdquo;
              </p>
            </div>
          )}

          <Kicker className="mb-3 block">In this look</Kicker>
          <div className="flex flex-col gap-[10px]">
            {pieces.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-[14px] rounded-[13px] bg-surface-1 px-[14px] py-[11px] shadow-[inset_0_0_0_1px_var(--hairline-2)]"
              >
                <div className="relative size-[46px] shrink-0 rounded-[10px] bg-surface-3 p-[7px]">
                  {/* absolute inset-0 gives object-contain a definite box — an
                      <img> sized by its intrinsic dimensions has spilled a row
                      on Safari before (see the closet grid). */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.imageUrl} alt="" className="absolute inset-0 size-full p-[7px] object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  {p.brand && <Kicker>{p.brand}</Kicker>}
                  <div className="mt-[2px] truncate text-[14.5px] text-value">{p.name}</div>
                </div>
                <div className="shrink-0 whitespace-nowrap text-[11px] text-muted-dim">
                  {p.category}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-30 flex gap-3 bg-gradient-to-t from-canvas from-60% to-transparent px-[22px] pb-[30px] pt-[14px]">
        <button
          type="button"
          aria-label="Favourite"
          aria-pressed={isFav}
          disabled={pending}
          onClick={() =>
            start(async () => {
              showFav(!isFav);
              await toggleFavorite(outfit.id);
            })
          }
          className="grid h-[54px] w-14 place-items-center rounded-[14px] bg-surface-2 shadow-[inset_0_0_0_1px_var(--hairline-7)]"
        >
          <Bookmark
            size={22}
            className={isFav ? "fill-brand text-brand" : "text-muted-foreground"}
          />
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              showWorn(!isWorn);
              await toggleWear(outfit.id);
            })
          }
          className={`min-h-[54px] flex-1 rounded-[14px] text-[15.5px] font-semibold transition-colors ${
            isWorn ? "bg-surface-2 text-value" : "bg-foreground text-canvas"
          }`}
        >
          {wearLabel(isWorn)}
        </button>
      </div>
    </div>
  );
}
