"use server";

import { createClient } from "@/lib/supabase/server";
import { isShareToken, isUuid } from "@/lib/share/snapshot";
import { prepare, publish, stateFor, stop } from "@/lib/share/store";
import { getActionLocale } from "@/lib/i18n/action-locale";

async function authed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function prepareShare(input: { outfitId: string; showBrands: boolean }) {
  const { supabase, user } = await authed();
  if (!isUuid(input?.outfitId)) throw new Error("Not found");
  return prepare(supabase, user.id, { outfitId: input.outfitId, showBrands: input.showBrands === true, locale: await getActionLocale() });
}

export async function publishShare(token: string) {
  const { supabase } = await authed();
  if (!isShareToken(token)) throw new Error("Not found");
  return publish(supabase, token);
}

export async function stopSharing(token: string) {
  const { supabase } = await authed();
  if (!isShareToken(token)) throw new Error("Not found");
  return stop(supabase, token);
}

export async function getShareState(outfitId: string) {
  const { supabase } = await authed();
  return isUuid(outfitId) ? stateFor(supabase, outfitId) : null;
}
