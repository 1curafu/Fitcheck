import { createClient } from "@/lib/supabase/server";

/**
 * Append one override. The only writer of `occasion_overrides`.
 *
 * Fire-and-forget from the caller's side (a failed insert must never disturb the
 * looks), so this swallows errors rather than throwing.
 */
export async function recordOverride(
  userId: string,
  generatedOn: string,
  predicted: string,
  chosen: string,
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("occasion_overrides")
    .insert({ user_id: userId, generated_on: generatedOn, predicted, chosen });
}
