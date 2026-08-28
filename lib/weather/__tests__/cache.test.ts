import { describe, expect, test, vi } from "vitest";
import { cachedSeries, WEATHER_MAX_AGE_H, type CacheStore, type CachedDay } from "../cache";
import hourlyFixture from "./fixtures/onecall-1h.json";
import dailyFixture from "./fixtures/onecall-1day.json";

const LAT = 52.52;
const LON = 13.41;
/** The fixture's own first local date, and the nine that follow it. */
const D0 = "2026-08-28";
const TEN_DAYS = Array.from({ length: 10 }, (_, i) => {
  const d = new Date(`${D0}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + i);
  return d.toISOString().slice(0, 10);
});
const NOW = new Date("2026-08-28T07:41:43Z");

/**
 * An in-memory stand-in for the Postgres table, so the logic is testable alone.
 *
 * ⚠️ Keyed by `lat|lon|day`, matching the table's composite primary key. An
 * earlier version keyed by `day` alone — which made the rounding test pass even
 * with `roundCoord` deleted, i.e. a test that could never have failed. Found by
 * the negative pass, which is the only reason it is not still here.
 */
function fakeStore(seed: { day: string; payload: CachedDay; fetchedAt: Date }[] = []) {
  const k = (lat: number, lon: number, day: string) => `${lat}|${lon}|${day}`;
  const rows = new Map(seed.map((r) => [k(LAT, LON, r.day), { payload: r.payload, fetchedAt: r.fetchedAt }]));
  const store: CacheStore & { rows: typeof rows; writes: number } = {
    rows,
    writes: 0,
    async read(lat, lon, dates) {
      const hit = new Map<string, { payload: CachedDay; fetchedAt: Date }>();
      for (const d of dates) {
        const r = rows.get(k(lat, lon, d));
        if (r) hit.set(d, r);
      }
      return hit;
    },
    async write(entries) {
      store.writes += 1;
      // `on conflict do nothing` — first writer wins, exactly like the table.
      for (const e of entries) {
        const key = k(e.lat, e.lon, e.day);
        if (!rows.has(key)) rows.set(key, { payload: e.payload, fetchedAt: e.fetchedAt });
      }
    },
  };
  return store;
}

function fetchers() {
  const daily = vi.fn(async () => dailyFixture);
  const hourly = vi.fn(async () => hourlyFixture);
  return { daily, hourly };
}

describe("cachedSeries — the read-through cache", () => {
  test("a miss calls each fetcher ONCE and stores the mapped series", async () => {
    const store = fakeStore();
    const f = fetchers();
    const out = await cachedSeries({ lat: LAT, lon: LON, dates: [D0], store, ...f, now: NOW });

    expect(f.daily).toHaveBeenCalledTimes(1);
    expect(f.hourly).toHaveBeenCalledTimes(1);
    expect(out.get(D0)!.daily).not.toBeNull();
    expect(out.get(D0)!.hourly.length).toBeGreaterThan(0);
    // The stored payload is OUR shape, never the provider's raw response.
    const row = store.rows.get(`${LAT}|${LON}|${D0}`)!;
    expect(row.payload).not.toHaveProperty("timezone_offset");
    expect(row.payload.timezoneOffset).toBe(7200);
  });

  test("a hit does NOT call the fetchers", async () => {
    const store = fakeStore();
    const first = fetchers();
    await cachedSeries({ lat: LAT, lon: LON, dates: [D0], store, ...first, now: NOW });

    const second = fetchers();
    await cachedSeries({ lat: LAT, lon: LON, dates: [D0], store, ...second, now: NOW });
    expect(second.daily).not.toHaveBeenCalled();
    expect(second.hourly).not.toHaveBeenCalled();
  });

  /**
   * ⚠️ THE ENTIRE ECONOMIC CASE FOR THIS DESIGN. One Call returns 10 daily
   * blocks in ONE response, so a ten-day trip must cost ONE call, not ten.
   * Assert it — the plan's own verification step tested only a single day and
   * would have missed this by a factor of ten.
   */
  test("ONE fetch fills every day it covers — a 10-day trip costs one call", async () => {
    const store = fakeStore();
    const f = fetchers();
    const out = await cachedSeries({ lat: LAT, lon: LON, dates: TEN_DAYS, store, ...f, now: NOW });

    expect(f.daily).toHaveBeenCalledTimes(1);
    expect(out.size).toBe(10);
    expect(store.rows.size).toBe(10);
    // And a second trip over the same window is free.
    const g = fetchers();
    await cachedSeries({ lat: LAT, lon: LON, dates: TEN_DAYS, store, ...g, now: NOW });
    expect(g.daily).not.toHaveBeenCalled();
  });

  test("two users in the same city on the same day cause ONE fetch", async () => {
    const store = fakeStore();
    const f = fetchers();
    await cachedSeries({ lat: LAT, lon: LON, dates: [D0], store, ...f, now: NOW });
    await cachedSeries({ lat: LAT, lon: LON, dates: [D0], store, ...f, now: NOW });
    expect(f.daily).toHaveBeenCalledTimes(1);
  });

  /**
   * ⚠️ A city waking up at 08:00 IS the concurrent case, and a crash there is a
   * blank weather strip for everyone in it.
   */
  test("two concurrent misses for the same key do not throw", async () => {
    const store = fakeStore();
    const f = fetchers();
    const both = await Promise.all([
      cachedSeries({ lat: LAT, lon: LON, dates: [D0], store, ...f, now: NOW }),
      cachedSeries({ lat: LAT, lon: LON, dates: [D0], store, ...f, now: NOW }),
    ]);
    expect(both[0].get(D0)).toBeDefined();
    expect(both[1].get(D0)).toBeDefined();
    expect(store.rows.size).toBe(10);
  });

  /**
   * ⚠️ A day-old temperature is a far better outcome than a screen with no
   * weather at all.
   */
  test("a fetcher failure falls back to the STALE row rather than throwing", async () => {
    const stale: CachedDay = {
      timezone: "Europe/Berlin",
      timezoneOffset: 7200,
      hourly: [{ dt: 1787893200, temp: 11.1, feelsLike: 10, conditionId: 800 }],
      daily: { dt: 1787875200, max: 12, min: 4, conditionId: 800 },
    };
    const store = fakeStore([
      { day: D0, payload: stale, fetchedAt: new Date(NOW.getTime() - 48 * 3600_000) },
    ]);
    const boom = async () => {
      throw new Error("openweather down");
    };
    const out = await cachedSeries({
      lat: LAT, lon: LON, dates: [D0], store, daily: boom, hourly: boom, now: NOW,
    });
    expect(out.get(D0)!.daily!.max).toBe(12); // the stale row, served
  });

  test("a fetcher failure with NO stale row yields no entry rather than throwing", async () => {
    const boom = async () => {
      throw new Error("openweather down");
    };
    const out = await cachedSeries({
      lat: LAT, lon: LON, dates: [D0], store: fakeStore(), daily: boom, hourly: boom, now: NOW,
    });
    expect(out.get(D0)).toBeUndefined();
  });

  /**
   * ⚠️ `fetched_at` exists for this. A row written at 06:00 is an 18-hour-old
   * prediction by midnight.
   */
  test("a row older than WEATHER_MAX_AGE_H is refetched", async () => {
    const store = fakeStore();
    await cachedSeries({ lat: LAT, lon: LON, dates: [D0], store, ...fetchers(), now: NOW });

    const later = new Date(NOW.getTime() + (WEATHER_MAX_AGE_H + 1) * 3600_000);
    const f = fetchers();
    await cachedSeries({ lat: LAT, lon: LON, dates: [D0], store, ...f, now: later });
    expect(f.daily).toHaveBeenCalledTimes(1);
  });

  test("a row INSIDE the freshness window is not refetched", async () => {
    const store = fakeStore();
    await cachedSeries({ lat: LAT, lon: LON, dates: [D0], store, ...fetchers(), now: NOW });

    const soon = new Date(NOW.getTime() + (WEATHER_MAX_AGE_H - 1) * 3600_000);
    const f = fetchers();
    await cachedSeries({ lat: LAT, lon: LON, dates: [D0], store, ...f, now: soon });
    expect(f.daily).not.toHaveBeenCalled();
  });

  /**
   * ⚠️ `roundCoord` (2dp ≈ 1.1km) exists precisely so everyone in one city
   * produces the same key. If the cache did not round, every GPS reading would
   * be a fresh miss and the whole design would be decorative.
   */
  test("nearby coordinates collapse to the same cache key", async () => {
    const store = fakeStore();
    const f = fetchers();
    await cachedSeries({ lat: 52.5201, lon: 13.4099, dates: [D0], store, ...f, now: NOW });
    await cachedSeries({ lat: 52.5234, lon: 13.4051, dates: [D0], store, ...f, now: NOW });
    expect(f.daily).toHaveBeenCalledTimes(1);
  });
});
