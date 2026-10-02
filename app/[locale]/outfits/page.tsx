import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { ScreenHeader } from "@/components/shell/screen-header";
import { SavedGrid, type SavedCard } from "@/components/outfits/saved-grid";
import { createClient } from "@/lib/supabase/server";
import { listSaved, countSaved } from "@/lib/outfits/saved";
import { currentEntitlements } from "@/lib/billing/entitlements";
import { redirect } from "@/lib/i18n/navigation";
import { displayPath, signItemImages } from "@/lib/storage/signed";
import { layoutForLook } from "@/lib/generator/layout";

type Search = Promise<{ before?: string | string[]; beforeId?: string | string[] }>;
type Item = { id: string; name: string | null; category: string; subcategory: string | null; brand: string | null; colors: string[] | null; cutout_url: string | null; image_url: string | null; thumb_url: string | null };

export default async function SavedPage({ searchParams }: { searchParams: Search }) {
  const t = await getTranslations("savedOutfits");
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <ScreenHeader title={t("title")} backHref="/profile" />
      <Suspense fallback={null}><SavedBody searchParams={searchParams} /></Suspense>
    </div>
  );
}

async function SavedBody({ searchParams }: { searchParams: Search }) {
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect({ href: "/sign-in", locale });
  const params = await searchParams;
  const cursor = z.iso.datetime({ offset: true }).safeParse(params.before);
  const cursorId = z.uuid().safeParse(params.beforeId);
  const [{ looks, more }, savedCount, entitlements] = await Promise.all([
    listSaved(supabase, user.id, cursor.success ? cursor.data : undefined, cursorId.success ? cursorId.data : undefined), countSaved(supabase, user.id), currentEntitlements(),
  ]);
  const ids = [...new Set(looks.flatMap(look => look.pieces.map(piece => piece.itemId)))];
  let items: Item[] = [];
  if (ids.length) {
    const { data, error } = await supabase.from("items")
      .select("id, name, category, subcategory, brand, colors, cutout_url, image_url, thumb_url")
      .eq("user_id", user.id).in("id", ids);
    if (error) throw new Error(error.message);
    items = (data ?? []) as Item[];
  }
  const images = await signItemImages(items.map(item => displayPath(item, "thumb")));
  const byId = new Map(items.map(item => [item.id, item]));
  const cards: SavedCard[] = looks.map(look => {
    const pieces = look.pieces.flatMap(piece => { const item = byId.get(piece.itemId); return item ? [item] : []; });
    const fallback = layoutForLook(pieces);
    const stored = new Map((look.layout?.pieces ?? []).map(piece => [piece.itemId, piece.slot]));
    return { ...look, displayPieces: pieces.flatMap((item, index) => {
      const image = images.get(displayPath(item, "thumb"));
      return image ? [{ itemId: item.id, category: item.category, subcategory: item.subcategory, brand: item.brand,
        name: item.name, colors: item.colors ?? [], cutoutUrl: image, slot: stored.get(item.id) ?? fallback[index] }] : [];
    }) };
  });
  return <SavedGrid looks={cards} savedCount={savedCount} limit={entitlements.savedOutfits} more={more} />;
}
