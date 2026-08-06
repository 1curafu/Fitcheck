"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PreferencesSchema, readPreferences } from "@/lib/profile/preferences";

/**
 * Persist a partial preferences patch.
 *
 * Merge-patch, not replace: two settings screens open at once must not have the
 * last save silently revert the other's toggle.
 *
 * Validation uses the STRICT schema — a bad value is rejected here rather than
 * repaired on every later read.
 */
export async function updatePreferences(patch: unknown): Promise<void> {
  const data = PreferencesSchema.partial().parse(patch);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: row } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", user.id)
    .single();

  const next = { ...readPreferences(row?.preferences), ...data };

  const { error } = await supabase.from("profiles").update({ preferences: next }).eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  // The stylist screen reads both preferences: rain guard reaches weatherRules,
  // tempUnit reaches the weather strip.
  revalidatePath("/generate");
}
