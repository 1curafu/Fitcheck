import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signItemImages, displayPath } from "@/lib/storage/signed";
import { todayFor } from "@/lib/outfits/today";
import { loadStyledLooks } from "@/lib/outfits/styled-store";
import { itemWearStats } from "@/lib/closet/wear-stats";
import { goesWith } from "@/lib/closet/goes-with";
import { ItemDetail, type DetailItem } from "@/components/closet/item-detail";
import type { GoesWithCard } from "@/components/closet/item-view";

export default function ItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  return (
    /**
     * ⚠️ `params` is passed straight through and awaited INSIDE the boundary.
     * Awaiting it here would block the shell on a value only known at request
     * time, and an unknown item id could not prerender at all — which is the
     * whole point for a route whose ids are user-specific and unbounded.
     */
    <Suspense fallback={null}>
      <ItemBody params={params} />
    </Suspense>
  );
}

async function ItemBody({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: item } = await supabase
    .from("items")
    .select("*")
    .eq("id", itemId)
    .single();
  if (!item) notFound();

  // The rest of the wardrobe — used for "Goes with" and the brand suggestions.
  const { data: closetRows } = await supabase
    .from("items")
    .select("*")
    .eq("archived", false);
  const closet = closetRows ?? [];

  /**
   * Wear history for ONE item, in two steps on purpose.
   *
   * A wear is logged against an OUTFIT, never an item, so an item's wear count
   * is "how many logged outfits contained it". `wear_logs` and `outfit_items`
   * are NOT directly related — both hang off `outfits` — so PostgREST cannot
   * embed one in the other, and an `outfit_items!inner(...)` join silently
   * returned zero rows for an item that had genuinely been worn. Two explicit
   * queries are obviously correct where that embed was quietly wrong.
   */
  const { data: wornIn } = await supabase
    .from("outfit_items")
    .select("outfit_id")
    .eq("item_id", itemId);
  const outfitIds = (wornIn ?? []).map((r) => r.outfit_id);
  const { data: logs } = outfitIds.length
    ? await supabase
        .from("wear_logs")
        .select("worn_on")
        .in("outfit_id", outfitIds)
    : { data: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("location_timezone")
    .eq("id", user.id)
    .single();
  const today = await todayFor(profile?.location_timezone);

  const stats = itemWearStats(logs ?? [], item.price, today);

  const pairIds = goesWith(
    {
      id: item.id,
      category: item.category,
      colors: item.colors ?? [],
      formality: item.formality,
    },
    closet.map((i) => ({
      id: i.id,
      category: i.category,
      colors: i.colors ?? [],
      formality: i.formality,
    })),
  );
  const byId = new Map(closet.map((i) => [i.id, i]));
  const pairs = pairIds.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });

  /**
   * Two sizes on one screen, signed together in one round-trip.
   *
   * The HERO keeps the full cutout — it is the product, it is what this whole
   * design is built around, and `DESIGN.md` makes the cutout the hero of the
   * item-detail screen.
   *
   * ⚠️ The "Goes with" tiles do NOT. They are `w-[92px]` with `p-3`, so a 68 CSS
   * px box, and there are four of them: measured, they were four fifths of the
   * images on this screen and most of its 352.5 kB. The plan's Task 3 says to
   * leave "the item-detail hero" on the cutout and it is right — but the hero is
   * one of these five images, not all five, and a 68px tile is exactly the
   * "pixels are wasted" case that task is named for.
   */
  const heroPath = displayPath(item);
  const pairPath = (i: (typeof pairs)[number]) => displayPath(i, "thumb");
  const signed = await signItemImages([heroPath, ...pairs.map(pairPath)]);

  const goesWithCards: GoesWithCard[] = pairs.map((i) => ({
    id: i.id,
    name: i.name ?? i.subcategory ?? i.category,
    imageUrl: signed.get(pairPath(i)) ?? "",
  }));

  // Distinct brands already in the closet → autocomplete suggestions.
  const brandSuggestions = [
    ...new Set(closet.map((i) => i.brand).filter(Boolean) as string[]),
  ];

  /**
   * Whether this piece already has a styled set today.
   *
   * Read on the SERVER, not tracked in the CTA's own state: tapping the primary
   * navigates straight to the look, so a session flag set on that tap is gone
   * the moment the user comes back and the component remounts — the "try
   * another" control could never appear at all.
   */
  const styledToday =
    (await loadStyledLooks(user.id, item.id, today)).length > 0;

  return (
    <ItemDetail
      item={item as DetailItem}
      imageUrl={signed.get(heroPath) ?? ""}
      brandSuggestions={brandSuggestions}
      stats={stats}
      goesWith={goesWithCards}
      styledToday={styledToday}
    />
  );
}
