import { connection } from "next/server";
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

  /**
   * ⚠️ `Date.now()` is an unstable value, and under Cache Components Next
   * refuses to prerender one — a clock read baked into a shell is frozen at
   * build time and wrong for everyone after the first visitor. This function is
   * request-time work by nature (it mints short-lived signed URLs), so saying
   * so explicitly is the honest fix rather than a workaround.
   *
   * ⚠️ It did NOT show up in `npm run build`, only in the dev overlay.
   */
  await connection();
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

/** A row as the readers select it. `thumb_url` may be absent entirely. */
export type ImageRow = {
  cutout_url: string | null;
  image_url: string;
  thumb_url?: string | null;
};

/**
 * Which stored object a surface should render.
 *
 * ⚠️ **`"full"` is the default, deliberately.** Six call sites pass these rows
 * in, and the signature growing must change none of them — a surface opts IN to
 * the smaller image. The flat-lay and the item-detail hero are the product and
 * stay on the cutout.
 *
 * ⚠️ **The fallback chain must never be broken.** A row uploaded before
 * thumbnails existed has no `thumb_url` and falls through to the cutout; a row
 * whose background removal failed has no `cutout_url` and falls through to the
 * original. Both are live in the current data, and a broken rung renders a
 * blank tile whose `load` never fires — which hangs `page.goto` until timeout
 * and reads like a missing element rather than a missing image.
 */
export function displayPath(item: ImageRow, size: "thumb" | "full" = "full") {
  if (size === "thumb" && item.thumb_url) return item.thumb_url;
  return item.cutout_url ?? item.image_url;
}
