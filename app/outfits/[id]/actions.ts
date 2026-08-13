"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { localDateFor } from "@/lib/outfits/local-date";
import { readPreferences } from "@/lib/profile/preferences";

/**
 * Log or unlog "I wore this today".
 *
 * This writes to wear_logs and nothing else — the outfit row is left alone on
 * purpose. A worn look stays in today's set, badged rather than removed, and
 * `saveDailyLooks` is what protects it from a later Regenerate by excluding
 * anything with a wear log from the day's delete. (That delete is also why the
 * FK used to matter: it had no ON DELETE action, so regenerating after a wear
 * raised a foreign-key violation.)
 *
 * Unlogging therefore just clears the badge. Nothing else about the day moves.
 */
export async function toggleWear(outfitId: string): Promise<{ worn: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  // The user's LOCAL date. `localDateFor` REQUIRES a timezone — there is no
  // zero-argument variant, and defaulting to UTC would move an evening wear in
  // Berlin onto the next day, which is exactly the bug this avoids. The zone
  // lives on the profile, written by the location work.
  const { data: profile } = await supabase
    .from("profiles")
    .select("location_timezone")
    .eq("id", user.id)
    .single();
  const today = localDateFor(new Date(), profile?.location_timezone ?? "UTC");

  // RLS scopes every statement below to the owner; a foreign id matches 0 rows.
  const { data: existing } = await supabase
    .from("wear_logs")
    .select("id")
    .eq("outfit_id", outfitId)
    .eq("worn_on", today)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("wear_logs").delete().eq("id", existing.id);
    if (error) throw new Error(error.message);
    revalidatePath(`/outfits/${outfitId}`);
    revalidatePath("/generate");
    return { worn: false };
  }

  const { data: outfit } = await supabase
    .from("outfits")
    .select("occasion")
    .eq("id", outfitId)
    .single();

  const { error } = await supabase.from("wear_logs").insert({
    user_id: user.id,
    outfit_id: outfitId,
    worn_on: today,
    occasion: outfit?.occasion ?? null,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/outfits/${outfitId}`);
  revalidatePath("/generate");
  return { worn: true };
}

export async function toggleFavorite(outfitId: string): Promise<{ favorite: boolean }> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("outfits")
    .select("is_favorite")
    .eq("id", outfitId)
    .single();

  const next = !row?.is_favorite;
  const { error } = await supabase
    .from("outfits")
    .update({ is_favorite: next })
    .eq("id", outfitId);
  if (error) throw new Error(error.message);

  revalidatePath(`/outfits/${outfitId}`);
  return { favorite: next };
}

/**
 * Stamp that the user opened this look.
 *
 * The evening confirmation asks only about looks actually OPENED — asking about
 * a look nobody saw would invite a "Yes" that fabricates a wear, and wear_logs
 * is the foundation of everything Pro sells. So opening one has to leave a
 * trace, and this is it.
 *
 * ⚠️ Called from the CLIENT on mount, never during the Server Component's
 * render. Mutating in render is a side effect React may run more than once, and
 * it would also fire for a prefetch the user never actually looked at — which
 * would put looks into the confirmation that were never on screen.
 *
 * Deliberately does NOT revalidate: nothing visible depends on the stamp, and a
 * revalidation here would re-render the screen the user just opened.
 */
export async function noteOutfitViewed(outfitId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // RLS scopes this to the owner; the explicit user_id keeps it true even if a
  // future policy is loosened.
  await supabase
    .from("outfits")
    .update({ viewed_at: new Date().toISOString() })
    .eq("id", outfitId)
    .eq("user_id", user.id);
}

/**
 * The evening confirmation's two answers.
 *
 * ⚠️ **"Yes" goes through `toggleWear`, never a second insert path.** The
 * `wear_logs_unique_day` index is what guarantees one row per outfit per day,
 * and a parallel insert here would be a second way to write the number every
 * wear-derived surface reads.
 *
 * ⚠️ **"No" writes NOTHING to `wear_logs`.** That is the entire point of the
 * feature: the rejected auto-log toggle would have logged a wear the user never
 * had, and no later query could tell it apart from a real one.
 *
 * Both record `wearAskedOn`, so the question is asked at most once a day
 * whichever way it went. A No that left it askable would reappear until the
 * user gave in and said Yes — manufacturing exactly the data this exists to
 * keep honest.
 */
export async function answerWearConfirmation(
  outfitId: string,
  wore: boolean,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferences, location_timezone")
    .eq("id", user.id)
    .single();

  const today = localDateFor(new Date(), profile?.location_timezone ?? "UTC");

  // Mark the question answered FIRST. If the wear write then fails, the user is
  // not re-asked tonight — better a missed log than a sheet that keeps
  // reappearing until they answer the way it wants.
  const next = { ...readPreferences(profile?.preferences), wearAskedOn: today };
  await supabase.from("profiles").update({ preferences: next }).eq("id", user.id);

  if (wore) {
    /**
     * ⚠️ Idempotent by construction — `toggleWear` is a TOGGLE, and "Yes" is
     * not. Calling it against an outfit already logged today would REMOVE the
     * wear the user just confirmed.
     *
     * Unreachable through the sheet, because `shouldAsk` refuses to ask once a
     * wear exists — but a Server Action is a public endpoint and this is a
     * loaded gun otherwise: a double-submit, a retry, or any future caller
     * would silently delete real data. A confirmation sets; it never unsets.
     */
    const { data: already } = await supabase
      .from("wear_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("outfit_id", outfitId)
      .eq("worn_on", today)
      .limit(1);

    if (!already?.length) await toggleWear(outfitId);
  }

  revalidatePath("/generate");
}
