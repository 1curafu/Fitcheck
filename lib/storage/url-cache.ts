export type CacheEntry = { url: string; expiresAtMs: number };
export type UrlCache = Map<string, CacheEntry>;

/** Signed URLs are minted for an hour (see signItemImages). */
export const TTL_MS = 60 * 60_000;

/**
 * Re-sign this long before expiry.
 *
 * A URL handed to the browser with seconds left would 404 mid-view, so an entry
 * inside the margin counts as stale. The remaining ~50 minutes is the window in
 * which the URL stays byte-identical and the browser cache can do its job.
 */
export const REFRESH_MARGIN_MS = 10 * 60_000;

/**
 * Split the requested paths into ones we can answer from cache and ones that
 * must be signed. Keyed on the full storage path — which begins with the owner's
 * user id — so entries cannot collide between users.
 */
export function partition(
  paths: string[],
  cache: UrlCache,
  nowMs: number,
  marginMs: number,
): { fresh: Map<string, string>; stale: string[] } {
  const fresh = new Map<string, string>();
  const stale: string[] = [];
  for (const path of paths) {
    const hit = cache.get(path);
    if (hit && hit.expiresAtMs - nowMs > marginMs) fresh.set(path, hit.url);
    else stale.push(path);
  }
  return { fresh, stale };
}

/** Record freshly minted URLs, and drop anything that has already lapsed. */
export function store(
  cache: UrlCache,
  minted: Map<string, string>,
  nowMs: number,
  ttlMs: number,
): void {
  for (const [path, entry] of cache) {
    if (entry.expiresAtMs <= nowMs) cache.delete(path);
  }
  for (const [path, url] of minted) {
    cache.set(path, { url, expiresAtMs: nowMs + ttlMs });
  }
}
