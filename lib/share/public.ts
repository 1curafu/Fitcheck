import { cache } from "react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isShareToken, type SnapshotPiece } from "./snapshot";

export type SharedLook = { lookName: string; reasoning: string | null; occasion: string | null; pieces: SnapshotPiece[]; version: number };

const Row = z.object({
  look_name: z.string(), reasoning: z.string().nullable(), occasion: z.string().nullable(),
  pieces: z.array(z.object({ n: z.number().int(), name: z.string(), category: z.string(), brand: z.string().nullable() })).min(1).max(8),
  updated_at: z.string(),
});

/**
 * The ONLY public read of a share (get_shared_look). Request-time via the server client (connection()); never
 * "use cache", so Stop sharing and expiry apply on the next request. React cache() dedupes metadata + body.
 */
export const readSharedLook = cache(async (token: string): Promise<SharedLook | null> => {
  if (!isShareToken(token)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_look", { p_token: token });
  if (error) throw error;
  const parsed = Row.safeParse(Array.isArray(data) ? data[0] : null);
  if (!parsed.success) return null;
  const r = parsed.data;
  return { lookName: r.look_name, reasoning: r.reasoning, occasion: r.occasion, pieces: r.pieces, version: Date.parse(r.updated_at) || 0 };
});

export function shareImageUrl(token: string, file: "story.jpg" | "post.jpg" | "og.jpg", version: number): string {
  // ?v= busts CDN and chat-preview caches after an Update link.
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/shares/${token}/${file}?v=${version}`;
}
