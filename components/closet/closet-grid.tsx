"use client";

import { useTranslations } from "next-intl";
import { useVocab } from "@/lib/i18n/vocab";

import { useState } from "react";
import { filterItems, type ClosetItem } from "@/lib/closet/filter";
import { Chip, ChipRow } from "@/components/ui-fitcheck/chip";
import { ItemCard } from "./item-card";

const CATS = ["All", "Tops", "Bottoms", "One-piece", "Outerwear", "Shoes", "Bags", "Accessories"] as const;
// Cycling heights give the prototype's masonry feel.
const HEIGHTS = [160, 190, 150, 200, 170, 185, 155];

type GridItem = ClosetItem & {
  name: string;
  brand: string | null;
  imageUrl: string;
};

export function ClosetGrid({ items, archived = false }: { items: GridItem[]; archived?: boolean }) {
  const t = useTranslations("closet");
  const label = useVocab();
  const categoryLabel = (value: string) => value === "All" ? t("filters.All") : label("category", value);
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const shown = filterItems(items, { category: cat, archived });

  return (
    <div className="flex flex-col gap-4 px-6">
      <ChipRow>
        {CATS.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {categoryLabel(c)}
          </Chip>
        ))}
      </ChipRow>

      {shown.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          {t("nothingIn", { category: categoryLabel(cat) })}
        </p>
      ) : (
        <div className="columns-2 gap-3">
          {shown.map((i, idx) => (
            <ItemCard
              key={i.id}
              id={i.id}
              name={i.name}
              brand={i.brand}
              imageUrl={i.imageUrl}
              height={HEIGHTS[idx % HEIGHTS.length]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
