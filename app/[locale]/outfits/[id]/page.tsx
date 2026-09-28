import { vocabLabel } from "@/lib/i18n/vocab-server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signItemImages, displayPath } from "@/lib/storage/signed";
import { todayFor } from "@/lib/outfits/today";
import { isWornToday } from "@/lib/outfits/wear";
import { readPreferences } from "@/lib/profile/preferences";
import { formatTemp } from "@/lib/weather/format";
import { layoutForLook } from "@/lib/generator/layout";
import {
  OutfitDetail,
  type DetailPiece,
} from "@/components/outfits/outfit-detail";
import { readOutfitTexts } from "@/lib/outfits/text-store";
import type { Locale } from "@/lib/i18n/locales";
import type { Slot } from "@/lib/generator/types";
import { redirect } from "@/lib/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";

type ItemRow = {
  id: string;
  name: string | null;
  subcategory: string | null;
  category: string;
  brand: string | null;
  image_url: string | null;
  cutout_url: string | null;
};

export default function OutfitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    // ⚠️ `params` is awaited INSIDE the boundary — awaiting it here would block
    // the shell on a request-time value, and an unknown outfit id could never
    // prerender.
    <Suspense fallback={null}>
      <OutfitBody params={params} />
    </Suspense>
  );
}

async function OutfitBody({ params }: { params: Promise<{ id: string }> }) {
  const tVocab = await getTranslations("vocab");
  const t = await getTranslations("outfit");
  const locale = await getLocale();
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect({ href: "/", locale: await getLocale() });

  // RLS scopes this to the owner — another user's id simply returns no row.
  const { data: outfit } = await supabase
    .from("outfits")
    .select(
      "id, text_locale, look_name, occasion, ai_reasoning, weather_snapshot, is_favorite, layout, styled_item_id, generated_on, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (!outfit) notFound();
  const source = { id: outfit.id, sourceLocale: outfit.text_locale as Locale, name: outfit.look_name ?? "", why: outfit.ai_reasoning as string | null };
  const [text] = await readOutfitTexts(supabase, [source], locale);

  const { data: links } = await supabase
    .from("outfit_items")
    .select(
      "slot, items(id, name, subcategory, category, brand, image_url, cutout_url)",
    )
    .eq("outfit_id", id);

  // The embed is one-to-one but PostgREST types it loosely; normalise once.
  const rows: ItemRow[] = (links ?? [])
    .map((l) => (Array.isArray(l.items) ? l.items[0] : l.items))
    .filter((i): i is ItemRow => Boolean(i));
  if (rows.length === 0) notFound();

  const signed = await signItemImages(rows.map((i) => displayPath(i)));

  // The stored geometry is what makes the detail stage identical to the look the
  // user tapped. Rows written before the daily drop have no layout — fall back
  // to computing one rather than dropping the flat-lay entirely.
  const stored = (outfit.layout ?? {}) as {
    pieces?: { itemId: string; slot: Slot }[];
  };
  const slotById = new Map(
    (stored.pieces ?? []).map((p) => [p.itemId, p.slot]),
  );
  const computed = layoutForLook(rows.map((r) => ({ category: r.category })));

  const pieces: DetailPiece[] = rows.map((i, idx) => ({
    id: i.id,
    name: i.name ?? i.subcategory ?? vocabLabel(tVocab, "category", i.category),
    brand: i.brand,
    category: i.category,
    imageUrl: signed.get(displayPath(i)) ?? "",
    slot: slotById.get(i.id) ?? computed[idx],
  }));

  const { data: logs } = await supabase
    .from("wear_logs")
    .select("worn_on")
    .eq("outfit_id", id);

  // Same timezone rule as the action — localDateFor takes a zone, never a bare Date.
  const { data: profile } = await supabase
    .from("profiles")
    .select("location_timezone, preferences")
    .eq("id", user.id)
    .single();
  const today = await todayFor(profile?.location_timezone);

  const weather = outfit.weather_snapshot as {
    tempC?: number;
    condition?: string;
  } | null;
  // The snapshot stores Celsius, as everything does; the unit is applied here.
  const prefs = readPreferences(profile?.preferences);

  return (
    <OutfitDetail
      outfit={{
        id: outfit.id,
        textSource: source, textLocale: locale, textTranslated: text.translated,
        lookName: text.name || t("todayLook"),
        occasion: outfit.occasion ?? "",
        weatherLabel: weather
          ? `${formatTemp(weather.tempC ?? 0, prefs.tempUnit)} ${weather.condition ?? ""}`.trim()
          : "",
        reasoning: text.why,
        // The share card's kicker date: the daily drop's local date, else the row's created day. Never weather (A3).
        lookDate: outfit.generated_on ?? (outfit.created_at ? outfit.created_at.slice(0, 10) : null),
      }}
      pieces={pieces}
      worn={isWornToday(logs ?? [], today)}
      favorite={outfit.is_favorite ?? false}
      styledItemId={outfit.styled_item_id ?? null}
    />
  );
}
