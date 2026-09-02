"use client";

import { useEffect, useState, useTransition } from "react";
import { archiveItem } from "@/app/closet/[itemId]/actions";
import type { Tags } from "@/lib/ai/tagging-schema";

import { ItemView, type GoesWithCard } from "./item-view";
import { ItemEditSheet } from "./item-edit-sheet";
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
  styledToday,
}: {
  item: DetailItem;
  imageUrl: string;
  brandSuggestions: string[];
  stats: { wears: number; costPerWear: string | null; lastWorn: string };
  goesWith: GoesWithCard[];
  /** Whether this piece already has a styled set today — read on the server. */
  styledToday: boolean;
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
  useEffect(() => () => setEditing(false), []);

  const [, start] = useTransition();

  function archive() {
    if (!confirm("Remove this piece from your closet?")) return;
    start(async () => {
      await archiveItem(item.id);
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
        onArchive={archive}
        // Built HERE, not passed down from the page. `page.tsx` is a Server
        // Component, and a JSX element handed across the RSC boundary is
        // serialised — React cannot give it positional identity and warns that
        // every child in a list needs a key. Creating it inside this client
        // component keeps ItemView presentational without that round trip.
        styleCta={<StyleCta itemId={item.id} styledToday={styledToday} />}
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
