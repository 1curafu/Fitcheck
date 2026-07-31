"use client";

import { useState, useTransition } from "react";
import { archiveItem } from "@/app/closet/[itemId]/actions";
import type { Tags } from "@/lib/ai/tagging-schema";

import { ItemView, type GoesWithCard } from "./item-view";
import { ItemEditSheet } from "./item-edit-sheet";

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
  styleCta,
}: {
  item: DetailItem;
  imageUrl: string;
  brandSuggestions: string[];
  stats: { wears: number; costPerWear: string | null; lastWorn: string };
  goesWith: GoesWithCard[];
  styleCta?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
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
        styleCta={styleCta}
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
