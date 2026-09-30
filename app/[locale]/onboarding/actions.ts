"use server";
import { redirect } from "@/lib/i18n/navigation";
import { getActionLocale } from "@/lib/i18n/action-locale";

import { createClient } from "@/lib/supabase/server";
import { StyleProfileSchema, formalityRange } from "@/lib/onboarding/style-profile";

export async function saveStyleProfile(input: unknown) {
  const data = StyleProfileSchema.parse(input);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect({ href: "/sign-in", locale: await getActionLocale() });

  const { error } = await supabase
    .from("profiles")
    .update({
      ...data,
      ...formalityRange(data.dress_codes),
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) throw error;

  // First-5-items capture (plan 04, Task 9).
  return redirect({ href: "/onboarding/capture", locale: await getActionLocale() });
}
