import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signItemImages, displayPath } from "@/lib/storage/signed";
import { ItemDetail, type DetailItem } from "@/components/closet/item-detail";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
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

  const signed = await signItemImages([displayPath(item)]);

  // Distinct brands already in the closet → autocomplete suggestions.
  const { data: brandRows } = await supabase
    .from("items")
    .select("brand")
    .eq("archived", false)
    .not("brand", "is", null);
  const brandSuggestions = [
    ...new Set((brandRows ?? []).map((r) => r.brand).filter(Boolean) as string[]),
  ];

  return (
    <ItemDetail
      item={item as DetailItem}
      imageUrl={signed.get(displayPath(item)) ?? ""}
      brandSuggestions={brandSuggestions}
    />
  );
}
