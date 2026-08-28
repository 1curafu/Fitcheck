import { expect, test } from "vitest";
import { mapSearch, pickLabel, regionLabel } from "../geocode";

/** Real shapes, taken from OpenWeather's /geo/1.0/direct on 2026-08-28. */
const ZURICH = [
  { name: "Zurich", state: "Zurich", country: "CH", lat: 47.3744, lon: 8.541 },
  { name: "Zurich", state: "Kansas", country: "US", lat: 39.2345, lon: -99.4382 },
  { name: "Zurich", state: "Frisia", country: "NL", lat: 53.1118, lon: 5.393 },
];

test("maps OpenWeather results to {name,country,lat,lon,state}", () => {
  const rows = mapSearch(ZURICH);
  expect(rows[0]).toEqual({
    name: "Zurich",
    country: "CH",
    lat: 47.3744,
    lon: 8.541,
    state: "Zurich",
  });
  expect(rows).toHaveLength(3);
});

/**
 * ⚠️ OpenWeather returns a bare ARRAY, not `{ results: [...] }` — Open-Meteo's
 * shape. A mapper that reached for `.results` would silently return [] forever,
 * and an empty city list looks exactly like "no matches" rather than a bug.
 */
test("a bare array is the response shape — not { results }", () => {
  expect(mapSearch([])).toEqual([]);
  expect(mapSearch(undefined as never)).toEqual([]);
  expect(mapSearch({ results: ZURICH } as never)).toEqual([]);
});

/**
 * ⚠️ `local_names` is a ~40-key blob of translations on every row. It must not
 * reach the client: it is by far the largest part of the payload and nothing
 * renders it.
 */
test("drops the local_names blob", () => {
  const rows = mapSearch([
    { name: "Zurich", country: "CH", lat: 47.37, lon: 8.54, local_names: { en: "Zurich", ar: "زيورخ" } },
  ] as never);
  expect(rows[0]).not.toHaveProperty("local_names");
  expect(Object.keys(rows[0]).sort()).toEqual(["country", "lat", "lon", "name"]);
});

test("label stays the bare city name — the weather strip truncates at ~9rem", () => {
  expect(pickLabel(mapSearch(ZURICH)[0])).toBe("Zurich");
});

/**
 * ⚠️ The reason `state` is carried at all. OpenWeather returns FIVE rows named
 * "Springfield", all in the US — and the picker renders name on the left and
 * country on the right, so without the state every row reads "Springfield  US"
 * and none of them can be told apart. Open-Meteo did not surface this because
 * its ranking rarely returned same-name duplicates.
 */
test("regionLabel disambiguates same-name cities in the same country", () => {
  const springfields = mapSearch([
    { name: "Springfield", state: "Illinois", country: "US", lat: 39.799, lon: -89.644 },
    { name: "Springfield", state: "Missouri", country: "US", lat: 37.1968, lon: -93.2947 },
  ]);
  const labels = springfields.map(regionLabel);
  expect(labels).toEqual(["Illinois, US", "Missouri, US"]);
  expect(new Set(labels).size).toBe(2); // genuinely distinguishable
});

test("regionLabel falls back to the country when there is no state", () => {
  expect(regionLabel({ name: "Zurich", country: "CH", lat: 47.37, lon: 8.54 })).toBe("CH");
});
