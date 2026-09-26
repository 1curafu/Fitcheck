import type { createClient } from "@/lib/supabase/server";
import { SHARE_CAP, SHARE_IMAGE_FILES, snapshotPieces } from "./snapshot";

export type ShareClient = Awaited<ReturnType<typeof createClient>>;
type ItemRow = { id: string; name: string | null; subcategory: string | null; category: string; brand: string | null };

/**
 * Builds or refreshes the frozen public snapshot of one look. Every value comes from the database through the
 * caller's RLS; the TOKEN is minted by the database (spec §0 A4). A refresh clears ready_at until publish (A7).
 */
export async function prepare(supabase: ShareClient, userId: string, input: { outfitId: string; showBrands: boolean }):
  Promise<{ status: "ok"; token: string } | { status: "limited"; message: string }> {
  const { data: outfit, error } = await supabase
    .from("outfits").select("id, look_name, occasion, ai_reasoning").eq("id", input.outfitId).maybeSingle();
  if (error) throw error;
  if (!outfit) throw new Error("Not found");

  const { data: links, error: linkError } = await supabase
    .from("outfit_items").select("items(id, name, subcategory, category, brand)").eq("outfit_id", outfit.id);
  if (linkError) throw linkError;
  const rows = (links ?? [])
    .map((l: { items: unknown }) => (Array.isArray(l.items) ? l.items[0] : l.items) as ItemRow | null)
    .filter((i): i is ItemRow => Boolean(i));
  if (rows.length === 0) throw new Error("Not found");

  const snapshot = {
    look_name: outfit.look_name ?? "Today's look",
    reasoning: outfit.ai_reasoning ?? null,
    occasion: outfit.occasion ?? null,
    pieces: snapshotPieces(rows.map((r) => ({ id: r.id, name: r.name ?? r.subcategory ?? r.category, brand: r.brand, category: r.category })), input.showBrands),
    show_brands: input.showBrands,
  };

  const { data: existing, error: existingError } = await supabase
    .from("look_shares").select("token, ready_at").eq("outfit_id", outfit.id).maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    const { error: updateError } = await supabase.from("look_shares")
      .update({ ...snapshot, ready_at: null, updated_at: new Date().toISOString() }).eq("token", existing.token);
    if (updateError) throw updateError;
    return { status: "ok", token: existing.token };
  }

  const { count, error: countError } = await supabase.from("look_shares").select("id", { count: "exact", head: true });
  if (countError || count === null) throw new Error("Cannot check shares");
  if (count >= SHARE_CAP) {
    return { status: "limited", message: `You can have up to ${SHARE_CAP} shared links. Stop sharing one in Settings to share another.` };
  }
  const { data: created, error: insertError } = await supabase
    .from("look_shares").insert({ ...snapshot, user_id: userId, outfit_id: outfit.id }).select("token").single();
  if (insertError) throw insertError;
  return { status: "ok", token: (created as { token: string }).token };
}

async function mustOwn(supabase: ShareClient, token: string) {
  const { data, error } = await supabase.from("look_shares").select("token, ready_at").eq("token", token).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Not found");
}

export async function publish(supabase: ShareClient, token: string): Promise<{ status: "published" } | { status: "error"; message: string }> {
  await mustOwn(supabase, token);
  const { data, error } = await supabase.storage.from("shares").list(token);
  const names = new Set((data ?? []).map((f) => f.name));
  if (error || !SHARE_IMAGE_FILES.every((f) => names.has(f))) return { status: "error", message: "Couldn't finish sharing. Try again." };
  const now = new Date().toISOString();
  const { error: updateError } = await supabase.from("look_shares").update({ ready_at: now, updated_at: now }).eq("token", token);
  if (updateError) throw updateError;
  return { status: "published" };
}

/** Images first, verified, THEN the row (the R2 order): a failure leaves the row so the user can retry. */
export async function stop(supabase: ShareClient, token: string): Promise<{ status: "stopped" } | { status: "error"; message: string }> {
  await mustOwn(supabase, token);
  const failed = { status: "error" as const, message: "Couldn't stop sharing. Nothing was changed — try again." };
  const bucket = supabase.storage.from("shares");
  const removed = await bucket.remove(SHARE_IMAGE_FILES.map((f) => `${token}/${f}`));
  if (removed.error) return failed;
  const listed = await bucket.list(token);
  if (listed.error || (listed.data ?? []).length > 0) return failed;
  const { error } = await supabase.from("look_shares").delete().eq("token", token);
  if (error) throw error;
  return { status: "stopped" };
}

export async function stateFor(supabase: ShareClient, outfitId: string): Promise<{ token: string; readyAt: string | null } | null> {
  const { data, error } = await supabase.from("look_shares").select("token, ready_at").eq("outfit_id", outfitId).maybeSingle();
  if (error) throw error;
  return data ? { token: data.token, readyAt: data.ready_at } : null;
}

export async function listMine(supabase: ShareClient) {
  const { data, error } = await supabase
    .from("look_shares").select("token, look_name, ready_at, created_at").order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as { token: string; look_name: string; ready_at: string | null; created_at: string }[])
    .map((r) => ({ token: r.token, lookName: r.look_name, readyAt: r.ready_at, createdAt: r.created_at }));
}
