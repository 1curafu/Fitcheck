"use server";
import { createClient } from "@/lib/supabase/server";
import { isShippedLocale } from "@/lib/i18n/locales";
import { validatedUniqueIds, type TranslationResult } from "@/lib/outfits/text";
import { ensureOutfitTexts,readOwnedOutfitSources,readOutfitTexts } from "@/lib/outfits/text-store";

async function authorizedInput(input: { outfitIds: string[]; locale: string }) {
  const client=await createClient();
  const {data:{user}}=await client.auth.getUser();
  if(!user) throw new Error("Not authenticated");
  if(!isShippedLocale(input?.locale)) throw new Error("Unsupported locale");
  return {client, ids:validatedUniqueIds(input.outfitIds), locale:input.locale};
}
export async function requestOutfitTexts(input: { outfitIds: string[]; locale: string }): Promise<TranslationResult> {
  const {client,ids,locale}=await authorizedInput(input);
  return ensureOutfitTexts(client,ids,locale);
}
export async function refreshOutfitTexts(input: { outfitIds: string[]; locale: string }): Promise<TranslationResult> {
  const {client,ids,locale}=await authorizedInput(input);
  const sources=await readOwnedOutfitSources(client,ids);
  return {locale,texts:await readOutfitTexts(client,sources,locale),busyIds:[]};
}
