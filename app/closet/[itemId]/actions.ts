"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UpdateSchema } from "@/lib/closet/update-schema";

export async function updateItem(itemId: string, input: unknown) {
  const data = UpdateSchema.parse(input);
  const supabase = await createClient();
  // RLS scopes this to the owner's rows; a foreign id simply matches 0 rows.
  const { error } = await supabase
    .from("items")
    .update({
      name: data.name,
      brand: data.brand,
      category: data.category,
      subcategory: data.subcategory,
      colors: data.colors,
      pattern: data.pattern,
      material: data.material,
      texture: data.texture,
      price: data.price,
      formality: data.formality,
      seasons: data.seasons,
      accent_color: data.accent_color,
      branding: data.branding,
      fit: data.fit,
      length: data.length,
      bulk: data.bulk,
      distressing: data.distressing,
    })
    .eq("id", itemId);
  if (error) throw error;
  revalidatePath("/closet");
  revalidatePath(`/closet/${itemId}`);
}

export async function archiveItem(itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("items")
    .update({ archived: true })
    .eq("id", itemId);
  if (error) throw error;
  revalidatePath("/closet");
  redirect("/closet");
}
