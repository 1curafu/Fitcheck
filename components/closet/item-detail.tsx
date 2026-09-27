"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveItem, deletePiece, eraseOriginal, restoreItem } from "@/app/[locale]/closet/[itemId]/actions";
import { UpgradeSheet } from "@/components/billing/upgrade-sheet";
import type { Tags } from "@/lib/ai/tagging-schema";

import { ItemView, type GoesWithCard } from "./item-view";
import { ItemEditSheet } from "./item-edit-sheet";
import { RemovePieceSheet } from "./remove-piece-sheet";
import { StyleCta } from "./style-cta";

export type DetailItem = {
  id: string;
  name: string | null;
  brand: string | null;
  category: Tags["category"];
  subcategory: string | null;
  colors: string[];
  material: string | null;
  texture: string | null;
  pattern: string | null;
  price: number | null;
  formality: number | null;
  seasons: string[];
  accent_color: Tags["accent_color"];
  branding: Tags["branding"];
  fit: Tags["fit"];
  fit_source?: Tags["fit_source"];
  length: Tags["length"];
  bulk: Tags["bulk"];
  distressing: Tags["distressing"];
};

/**
 * The item detail shell.
 *
 * This file used to BE the tag form. The design's item detail is read-first —
 * cutouts are the hero, the stat tiles answer "how do I actually wear this?",
 * and editing sits behind `⋯`. So this component now owns only the switch
 * between the two: `ItemView` reads, `ItemEditSheet` writes.
 */
export function ItemDetail({
  item,
  imageUrl,
  brandSuggestions,
  stats,
  goesWith,
  archived,
  canEraseOriginal,
}: {
  item: DetailItem;
  imageUrl: string;
  brandSuggestions: string[];
  stats: { wears: number; costPerWear: string | null; lastWorn: string };
  goesWith: GoesWithCard[];
  /** The piece is removed (archived): the page offers Put back instead of Remove + Style. */
  archived: boolean;
  /** Read on the server: the piece has a cut-out and a well-formed original to erase (spec §3.3). */
  canEraseOriginal: boolean;
}) {
  const [editing, setEditing] = useState(false);
  /**
   * ⚠️ Close the sheet when this screen is left.
   *
   * Cache Components preserves a route with React `<Activity hidden>` rather
   * than unmounting it, so `useState` survives navigation — leave with the
   * sheet open and it is still open on return. The unmount used to do this for
   * free. Same fix as `components/generate/stylist.tsx`.
   */
  const router = useRouter();
  // "choose" opens the full Remove sheet; "erase" and "delete" open straight on their confirm (a removed piece's page).
  const [sheet, setSheet] = useState<null | "choose" | "erase" | "delete">(null);
  const [eraseError, setEraseError] = useState<string | null>(null);
  const [limit, setLimit] = useState<string | null>(null);
  useEffect(
    () => () => {
      setEditing(false);
      setSheet(null);
      setEraseError(null);
      setLimit(null);
    },
    [],
  );

  const [pending, start] = useTransition();

  function archive() {
    start(async () => {
      await archiveItem(item.id);
    });
  }

  function erase() {
    setEraseError(null);
    start(async () => {
      // Success redirects to /closet and never returns here.
      const result = await eraseOriginal(item.id);
      if (result) setEraseError(result.message);
    });
  }

  function remove() {
    setEraseError(null);
    start(async () => {
      // Success redirects to Removed pieces and never returns here.
      const result = await deletePiece(item.id);
      if (result) setEraseError(result.message);
    });
  }

  function restore() {
    start(async () => {
      const result = await restoreItem(item.id);
      if (result.status === "limited") setLimit(result.message);
      else router.refresh();
    });
  }

  return (
    <>
      <ItemView
        item={item}
        imageUrl={imageUrl}
        stats={stats}
        goesWith={goesWith}
        onEdit={() => setEditing(true)}
        onArchive={() => setSheet("choose")}
        removed={
          archived
            ? {
                canEraseOriginal,
                restoring: pending,
                onRestore: restore,
                onEraseOriginal: () => setSheet("erase"),
                onDelete: () => setSheet("delete"),
              }
            : undefined
        }
        // Built HERE, not passed down from the page. `page.tsx` is a Server
        // Component, and a JSX element handed across the RSC boundary is
        // serialised — React cannot give it positional identity and warns that
        // every child in a list needs a key. Creating it inside this client
        // component keeps ItemView presentational without that round trip.
        styleCta={<StyleCta itemId={item.id} />}
      />
      {sheet && (
        <RemovePieceSheet
          pending={pending}
          canErase={canEraseOriginal}
          startAt={sheet}
          error={eraseError}
          onRemove={archive}
          onErase={erase}
          onDelete={remove}
          onClose={() => {
            setSheet(null);
            setEraseError(null);
          }}
        />
      )}
      <UpgradeSheet
        open={Boolean(limit)}
        title="Put more pieces back"
        body={limit ?? ""}
        onClose={() => setLimit(null)}
      />
      {editing && (
        <ItemEditSheet
          item={item}
          brandSuggestions={brandSuggestions}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}
