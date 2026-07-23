import { partition, store, type UrlCache } from "../url-cache";

const NOW = 1_000_000;
const MINUTE = 60_000;

test("a path we have never signed is stale", () => {
  const { fresh, stale } = partition(["a.png"], new Map(), NOW, 10 * MINUTE);
  expect(stale).toEqual(["a.png"]);
  expect(fresh.size).toBe(0);
});

test("a comfortably-fresh entry is reused, URL unchanged", () => {
  const cache: UrlCache = new Map([["a.png", { url: "https://signed/a", expiresAtMs: NOW + 40 * MINUTE }]]);
  const { fresh, stale } = partition(["a.png"], cache, NOW, 10 * MINUTE);
  expect(stale).toEqual([]);
  expect(fresh.get("a.png")).toBe("https://signed/a");
});

// Re-sign BEFORE the URL dies, not after. Handing out a URL with 30 seconds
// left means the image 404s while the user is still looking at it.
test("an entry inside the refresh margin is treated as stale", () => {
  const cache: UrlCache = new Map([["a.png", { url: "https://signed/a", expiresAtMs: NOW + 5 * MINUTE }]]);
  const { stale } = partition(["a.png"], cache, NOW, 10 * MINUTE);
  expect(stale).toEqual(["a.png"]);
});

test("an expired entry is stale", () => {
  const cache: UrlCache = new Map([["a.png", { url: "https://signed/a", expiresAtMs: NOW - MINUTE }]]);
  const { stale } = partition(["a.png"], cache, NOW, 10 * MINUTE);
  expect(stale).toEqual(["a.png"]);
});

test("a mixed batch only asks Storage for the paths it actually needs", () => {
  const cache: UrlCache = new Map([["a.png", { url: "https://signed/a", expiresAtMs: NOW + 40 * MINUTE }]]);
  const { fresh, stale } = partition(["a.png", "b.png"], cache, NOW, 10 * MINUTE);
  expect(fresh.get("a.png")).toBe("https://signed/a");
  expect(stale).toEqual(["b.png"]);
});

test("store records an expiry a full TTL out", () => {
  const cache: UrlCache = new Map();
  store(cache, new Map([["a.png", "https://signed/a"]]), NOW, 60 * MINUTE);
  expect(cache.get("a.png")).toEqual({ url: "https://signed/a", expiresAtMs: NOW + 60 * MINUTE });
});

// The cache lives for the lifetime of the server process. Without pruning, a
// long-running instance accumulates an entry per image per user, forever.
test("store prunes entries that have already expired", () => {
  const cache: UrlCache = new Map([["old.png", { url: "https://signed/old", expiresAtMs: NOW - MINUTE }]]);
  store(cache, new Map([["a.png", "https://signed/a"]]), NOW, 60 * MINUTE);
  expect(cache.has("old.png")).toBe(false);
  expect(cache.has("a.png")).toBe(true);
});
