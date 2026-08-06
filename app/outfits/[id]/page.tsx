import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signItemImages, displayPath } from "@/lib/storage/signed";
import { localDateFor } from "@/lib/outfits/local-date";
import { isWornToday } from "@/lib/outfits/wear";
import { readPreferences } from "@/lib/profile/preferences";
import { formatTemp } from "@/lib/weather/format";
import { layoutForLook } from "@/lib/generator/layout";
import { OutfitDetail, type DetailPiece } from "@/components/outfits/outfit-detail";
import type { Slot } from "@/lib/generator/types";

type ItemRow = {
  id: string;
  name: string | null;
  subcategory: string | null;
  category: string;
  brand: string | null;
  image_url: string;
  cutout_url: string | null;
};

export default async function OutfitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // RLS scopes this to the owner — another user's id simply returns no row.
  const { data: outfit } = await supabase
    .from("outfits")
    .select("id, look_name, occasion, ai_reasoning, weather_snapshot, is_favorite, layout")
    .eq("id", id)
    .maybeSingle();
  if (!outfit) notFound();

  const { data: links } = await supabase
    .from("outfit_items")
    .select("slot, items(id, name, subcategory, category, brand, image_url, cutout_url)")
    .eq("outfit_id", id);

  // The embed is one-to-one but PostgREST types it loosely; normalise once.
  const rows: ItemRow[] = (links ?? [])
    .map((l) => (Array.isArray(l.items) ? l.items[0] : l.items))
    .filter((i): i is ItemRow => Boolean(i));
  if (rows.length === 0) notFound();

  const signed = await signItemImages(rows.map(displayPath));

  // The stored geometry is what makes the detail stage identical to the look the
  // user tapped. Rows written before the daily drop have no layout — fall back
  // to computing one rather than dropping the flat-lay entirely.
  const stored = (outfit.layout ?? {}) as { pieces?: { itemId: string; slot: Slot }[] };
  const slotById = new Map((stored.pieces ?? []).map((p) => [p.itemId, p.slot]));
  const computed = layoutForLook(rows.map((r) => ({ category: r.category })));

  const pieces: DetailPiece[] = rows.map((i, idx) => ({
    id: i.id,
    name: i.name ?? i.subcategory ?? i.category,
    brand: i.brand,
    category: i.category,
    imageUrl: signed.get(displayPath(i)) ?? "",
    slot: slotById.get(i.id) ?? computed[idx],
  }));

  const { data: logs } = await supabase.from("wear_logs").select("worn_on").eq("outfit_id", id);

  // Same timezone rule as the action — localDateFor takes a zone, never a bare Date.
  const { data: profile } = await supabase
    .from("profiles")
    .select("location_timezone, preferences")
    .eq("id", user.id)
    .single();
  const today = localDateFor(new Date(), profile?.location_timezone ?? "UTC");

  const weather = outfit.weather_snapshot as { tempC?: number; condition?: string } | null;
  // The snapshot stores Celsius, as everything does; the unit is applied here.
  const prefs = readPreferences(profile?.preferences);

  return (
    <OutfitDetail
      outfit={{
        id: outfit.id,
        lookName: outfit.look_name ?? "Today's look",
        occasion: outfit.occasion ?? "",
        weatherLabel: weather
          ? `${formatTemp(weather.tempC ?? 0, prefs.tempUnit)} ${weather.condition ?? ""}`.trim()
          : "",
        reasoning: outfit.ai_reasoning,
      }}
      pieces={pieces}
      worn={isWornToday(logs ?? [], today)}
      favorite={outfit.is_favorite ?? false}
    />
  );
}
