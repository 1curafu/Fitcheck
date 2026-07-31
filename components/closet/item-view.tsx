"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";
import { Kicker } from "@/components/ui-fitcheck/kicker";
import { FORMALITY_LABEL } from "@/lib/closet/vocab";
import type { DetailItem } from "./item-detail";

export type GoesWithCard = { id: string; name: string; imageUrl: string };

/** A stat tile. `value` is already formatted — this renders, it does not compute. */
function Tile({ value, label }: { value: string; label: string }) {
  return (
    // The labels are BOTTOM-aligned (`mt-auto` in an equal-height flex row)
    // rather than spaced by a fixed top margin, so they stay on one line however
    // tall a value renders — "Yesterday" wraps on a narrow phone, "1" never does.
    <div className="flex flex-1 flex-col rounded-[13px] bg-surface-1 p-[14px] shadow-[inset_0_0_0_1px_var(--hairline-2)]">
      {/* ONE size across all three tiles. The design sets the two numeric tiles
          at 26px and the phrase at 17px, but a row of tiles that disagree on
          type size reads as three unrelated cards rather than one summary. */}
      <div className="font-serif text-[15px] leading-none text-foreground">{value}</div>
      <div className="mt-auto pt-[6px] text-[10px] uppercase tracking-[0.1em] text-muted-dim">
        {label}
      </div>
    </div>
  );
}

function TagRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-[14px] not-last:border-b not-last:border-[var(--hairline-2)]">
      <div className="text-[13px] text-muted-dim">{label}</div>
      <div className="text-right text-[14px] text-value">{value}</div>
    </div>
  );
}

/**
 * Item detail, read-first (Fitcheck.dc.html:587-657).
 *
 * The screen the design calls the canonical one: cutout is the hero, everything
 * else is quiet around it, and the rust accent appears EXACTLY once — the
 * formality meter. Editing lives behind `⋯`; this screen answers "how do I
 * actually wear this?", not "what are its tags?".
 *
 * It opens with a full-bleed stage, so it deliberately does NOT use
 * `.screen-top` — the two floating controls carry the safe-area inset instead.
 */
export function ItemView({
  item,
  imageUrl,
  stats,
  goesWith,
  onEdit,
  onArchive,
  styleCta,
}: {
  item: DetailItem;
  imageUrl: string;
  stats: { wears: number; costPerWear: string | null; lastWorn: string };
  goesWith: GoesWithCard[];
  onEdit: () => void;
  onArchive: () => void;
  /** The primary action. Supplied by the shell so this stays presentational. */
  styleCta?: React.ReactNode;
}) {
  const router = useRouter();
  const title = item.name ?? item.subcategory ?? item.category;
  // Plenty of items are named after their own subcategory ("Oxford shirt"), and
  // the design's pairing (`Pale Blue Oxford` / `Oxford shirt · Pale blue`) only
  // reads when the two differ. Repeating it verbatim under the title looks like
  // a rendering bug.
  const subtitle = [item.subcategory === title ? null : item.subcategory, item.colors[0]]
    .filter(Boolean)
    .join(" · ");

  const tags: [string, string | null][] = [
    ["Category", item.category],
    ["Colour", item.colors.join(" · ") || null],
    ["Material", item.material],
    ["Texture", item.texture],
    ["Pattern", item.pattern],
    ["Seasons", item.seasons.join(" · ") || null],
  ];

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <div className="absolute inset-x-[18px] top-[calc(env(safe-area-inset-top)+18px)] z-40 flex justify-between">
        <button
          type="button"
          onClick={() => {
            // Dead on a shared link, a refresh or a PWA cold start otherwise —
            // the same trap the outfit detail's back button hit.
            if (window.history.length > 1) router.back();
            else router.push("/closet");
          }}
          aria-label="Back"
          className="grid size-10 place-items-center rounded-full bg-[rgba(20,19,22,0.7)] text-xl text-foreground shadow-[inset_0_0_0_1px_var(--hairline-7)] backdrop-blur-[10px]"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={onEdit}
          aria-label="More"
          className="grid size-10 place-items-center rounded-full bg-[rgba(20,19,22,0.7)] text-lg text-muted-foreground shadow-[inset_0_0_0_1px_var(--hairline-7)] backdrop-blur-[10px]"
        >
          ⋯
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-[130px]">
        <div className="surface-stage relative h-[360px]">
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={title}
              className="absolute inset-0 size-full object-contain p-10"
            />
          )}
        </div>

        <div className="px-6 pt-[6px]">
          {item.brand && <Kicker>{item.brand}</Kicker>}
          <h1 className="mt-[6px] font-serif text-[30px]/[1.05] text-foreground">{title}</h1>
          {subtitle && (
            <p data-testid="item-subtitle" className="mt-[5px] text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}

          <div className="mt-[22px] flex gap-[10px]">
            <Tile value={String(stats.wears)} label="Times worn" />
            {/* Omitted rather than shown as £0.00 — an unpriced item has no
                cost per wear, and printing one states something false. */}
            {stats.costPerWear && (
              <Tile value={stats.costPerWear} label="Cost / wear" />
            )}
            <Tile value={stats.lastWorn} label="Last worn" />
          </div>

          {/* The One Rust Rule's single spend on this screen. Always paired with
              the WORD — a bare 1–5 means nothing to the person reading it. */}
          <div className="mt-[22px]">
            <div className="mb-[10px] flex justify-between">
              <Kicker>Formality</Kicker>
              <span className="text-xs text-muted-foreground">
                {FORMALITY_LABEL[item.formality ?? 3]}
              </span>
            </div>
            <div className="flex gap-[6px]">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className={`h-2 flex-1 rounded-full ${
                    n <= (item.formality ?? 3) ? "bg-brand" : "bg-foreground/10"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="mt-[22px] overflow-hidden rounded-[14px] bg-surface-1 shadow-[inset_0_0_0_1px_var(--hairline-2)]">
            {tags
              .filter((t): t is [string, string] => Boolean(t[1]))
              .map(([k, v]) => (
                <TagRow key={k} label={k} value={v} />
              ))}
          </div>

          {goesWith.length > 0 && (
            <>
              <Kicker className="mb-3 mt-[26px] block">Goes with</Kicker>
              <div className="flex gap-[10px] overflow-x-auto">
                {goesWith.map((g) => (
                  <Link key={g.id} href={`/closet/${g.id}`} className="w-[92px] shrink-0">
                    <div className="relative aspect-square rounded-[12px] bg-surface-2 shadow-[inset_0_0_0_1px_var(--hairline-2)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={g.imageUrl}
                        alt=""
                        className="absolute inset-0 size-full object-contain p-3"
                      />
                    </div>
                    <div className="mt-[6px] text-center text-[10.5px]/[1.2] text-muted-foreground">
                      {g.name}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 z-30 flex gap-3 bg-gradient-to-t from-canvas from-60% to-transparent px-[22px] pb-[calc(env(safe-area-inset-bottom)+14px)] pt-[14px]">
        <button
          type="button"
          onClick={onArchive}
          aria-label="Archive"
          className="grid h-[54px] w-14 place-items-center rounded-[14px] bg-surface-2 text-muted-foreground shadow-[inset_0_0_0_1px_var(--hairline-6)]"
        >
          <Archive size={19} />
        </button>
        {styleCta}
      </div>
    </div>
  );
}
