import "server-only";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";
import { LOCALES, type ShippedLocale } from "@/lib/i18n/locales";
import { selectOutfitText, type OutfitTextSource, type OutfitText, type TranslationRow, type TranslationResult, type TranslationClaim, type TranslationCompletion } from "./text";
import { translateOutfitText } from "./translate";

export type TextClient = Awaited<ReturnType<typeof createClient>>;
const Source = z.object({ id: z.uuid(), sourceLocale: z.enum(LOCALES), name: z.string().max(120), why: z.string().max(2000).nullable() });
const Claims = z.array(z.object({ source: Source, status: z.enum(["source","ready","claimed","busy","cooldown","limited"]), leaseToken: z.uuid().nullish() })).max(6);
const SourceRows = z.array(z.object({ id: z.uuid(), text_locale: z.enum(LOCALES), look_name: z.string().nullable(), ai_reasoning: z.string().nullable() }));
const diagnostic = (status: string, count: number) => Sentry.captureMessage("outfit translation " + status, { level: "warning", extra: { count } });

/** The request client enforces owner RLS; caller snapshots never supply originals. */
export async function readOwnedOutfitSources(client: TextClient, ids: string[]): Promise<OutfitTextSource[]> {
  if (!ids.length) return [];
  try {
    const { data, error } = await client.from("outfits").select("id,text_locale,look_name,ai_reasoning").in("id",ids);
    if (error) throw new Error("Read failed");
    return SourceRows.parse(data ?? []).map(row => ({ id: row.id, sourceLocale: row.text_locale, name: row.look_name ?? "", why: row.ai_reasoning }));
  } catch { diagnostic("source read failed", ids.length); return []; }
}

/** Cache SELECT only: rendering never waits for paid work. */
export async function readOutfitTexts(client: TextClient, sources: OutfitTextSource[], locale: ShippedLocale): Promise<OutfitText[]> {
  const needsCache = sources.filter(source => source.sourceLocale !== locale);
  if (!needsCache.length) return sources.map(source => selectOutfitText(source,locale));
  try {
    const { data, error } = await client.from("outfit_text_translations").select("outfit_id,target_locale,source_locale,source_name,source_why,name,why,status").in("outfit_id",needsCache.map(s => s.id)).eq("target_locale",locale);
    if (error) throw new Error("Read failed");
    const rows = (data ?? []) as TranslationRow[];
    return sources.map(source => selectOutfitText(source,locale,rows.find(row => row.outfit_id === source.id)));
  } catch { diagnostic("cache read failed", sources.length); return sources.map(source => selectOutfitText(source,locale)); }
}

export async function ensureOutfitTexts(client: TextClient, ids: string[], locale: ShippedLocale): Promise<TranslationResult> {
  if (ids.length < 1 || ids.length > 6) throw new Error("Invalid translation batch");
  let claimed: TranslationClaim[] = [];
  let busyIds: string[] = [];
  try {
    const { data, error } = await client.rpc("claim_outfit_text_translations",{ p_outfit_ids: ids, p_locale: locale });
    if (error) throw new Error("Claim failed");
    const rows = Claims.parse(data);
    if (new Set(rows.map(r => r.source.id)).size !== rows.length || rows.some(r => !ids.includes(r.source.id))) throw new Error("Invalid claims");
    busyIds = rows.filter(row => row.status === "busy").map(row => row.source.id);
    claimed = rows.filter(row => row.status === "claimed").map(row => {
      if (!row.leaseToken) throw new Error("Invalid claim lease");
      return { source: row.source, targetLocale: locale, leaseToken: row.leaseToken };
    });
    if (claimed.length) {
      const outputs = await translateOutfitText(claimed);
      const completions: TranslationCompletion[] = claimed.map(claim => {
        const output = outputs.find(row => row.id === claim.source.id);
        if (!output) throw new Error("Missing translation");
        return { outfitId: output.id, leaseToken: claim.leaseToken, status: "ready", name: output.name, why: output.why };
      });
      const finished = await client.rpc("finish_outfit_text_translations",{ p_locale: locale, p_results: completions });
      if (finished.error) throw new Error("Completion failed");
    }
  } catch {
    diagnostic("work failed",ids.length);
    if (claimed.length) {
      try {
        const failed: TranslationCompletion[] = claimed.map(claim => ({ outfitId: claim.source.id, leaseToken: claim.leaseToken, status: "failed" }));
        const result = await client.rpc("finish_outfit_text_translations",{ p_locale: locale, p_results: failed });
        if (result.error) diagnostic("failure completion failed",claimed.length);
      } catch { diagnostic("failure completion failed",claimed.length); }
    }
  }
  const sources = await readOwnedOutfitSources(client,ids);
  const texts = await readOutfitTexts(client,sources,locale);
  return { locale,texts,busyIds: busyIds.filter(id => texts.some(text => text.id === id && !text.translated && text.source.sourceLocale !== locale)) };
}
