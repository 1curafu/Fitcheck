import { createClient } from "@/lib/supabase/server";
import {
  partition,
  store,
  REFRESH_MARGIN_MS,
  TTL_MS,
  type UrlCache,
} from "./url-cache";

/**
 * Process-wide signed-URL cache.
 *
 * `createSignedUrls` returns a NEW token every call, so re-signing the same file
 * yields a different URL — which the browser treats as a different image and
 * re-downloads. Measured on the generator: switching occasion produced 3 of 3
 * identical files and 0 of 3 identical URLs.
 *
 * Caching is safe because a signed URL is a capability for one path, and the
 * caller has already had to obtain that path through RLS to ask for it. The
 * cache grants nothing a caller could not mint for itself a line later.
 */
const cache: UrlCache = new Map();

export async function signItemImages(paths: string[], expiresIn = 3600) {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;

  const now = Date.now();
  const { fresh, stale } = partition(paths, cache, now, REFRESH_MARGIN_MS);
  for (const [path, url] of fresh) map.set(path, url);
  if (stale.length === 0) return map;

  const supabase = await createClient();
  const { data } = await supabase.storage.from("wardrobe").createSignedUrls(stale, expiresIn);

  const minted = new Map<string, string>();
  data?.forEach((d) => {
    if (d.path && d.signedUrl) minted.set(d.path, d.signedUrl);
  });

  store(cache, minted, now, Math.min(TTL_MS, expiresIn * 1000));
  for (const [path, url] of minted) map.set(path, url);
  return map;
}

export function displayPath(item: { cutout_url: string | null; image_url: string }) {
  return item.cutout_url ?? item.image_url;
}
