"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TagSchema } from "@/lib/ai/tagging-schema";

const UpdateSchema = z.object({
  name: z.string().nullable(),
  brand: z.string().nullable(),
  category: TagSchema.shape.category,
  material: TagSchema.shape.material,
  formality: TagSchema.shape.formality,
  seasons: TagSchema.shape.seasons,
});

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
      material: data.material,
      formality: data.formality,
      seasons: data.seasons,
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
