import {
  roundCoord,
  resolveLocation,
  DEFAULT_LOCATION,
  LocationInputSchema,
  locationColumns,
  locationChanged,
} from "../location";

test("roundCoord snaps to 2dp (~1.1km) so neighbours share one cached forecast URL", () => {
  expect(roundCoord(52.5187234)).toBe(52.52);
  expect(roundCoord(-0.1277583)).toBe(-0.13);
  expect(roundCoord(13.41)).toBe(13.41); // already short — unchanged
  expect(roundCoord(0)).toBe(0);
});

test("client-chosen location wins over everything, carrying its source as the origin", () => {
  const r = resolveLocation({
    input: { lat: 51.5, lon: -0.1, label: "London", source: "city" },
    profile: { location_lat: 48.14, location_lon: 11.58, location_label: "Munich" },
  });
  expect(r).toEqual({ lat: 51.5, lon: -0.1, label: "London", origin: "city" });
});

test("falls back to the profile when there is no client choice", () => {
  const r = resolveLocation({
    profile: { location_lat: 48.14, location_lon: 11.58, location_label: "Munich" },
  });
  expect(r).toEqual({ lat: 48.14, lon: 11.58, label: "Munich", origin: "profile" });
});

test("a profile row with no coords is NOT a location — falls through to the default", () => {
  const r = resolveLocation({
    profile: { location_lat: null, location_lon: null, location_label: null },
  });
  expect(r).toEqual({ ...DEFAULT_LOCATION });
  expect(r.origin).toBe("default");
});

test("no input and no profile → the default", () => {
  expect(resolveLocation({})).toEqual({ ...DEFAULT_LOCATION });
  expect(resolveLocation({ profile: null })).toEqual({ ...DEFAULT_LOCATION });
});

test("a stored location with no label is labelled Current location (we never reverse-geocode)", () => {
  const r = resolveLocation({
    profile: { location_lat: 48.14, location_lon: 11.58, location_label: null },
  });
  expect(r.label).toBe("Current location");
});

test("a stored city is reported as origin 'city' — GPS must not silently override it", () => {
  const r = resolveLocation({
    profile: {
      location_lat: 35.69, location_lon: 139.69,
      location_label: "Tokyo", location_source: "city",
    },
  });
  expect(r.origin).toBe("city");
  expect(r.label).toBe("Tokyo");
});

test("a stored geo fix is reported as origin 'geo' — safe to silently refresh", () => {
  const r = resolveLocation({
    profile: {
      location_lat: 47.24, location_lon: 8.92,
      location_label: "Current location", location_source: "geo",
    },
  });
  expect(r.origin).toBe("geo");
});

test("a legacy row with coords but no source is plain 'profile'", () => {
  const r = resolveLocation({
    profile: { location_lat: 47.24, location_lon: 8.92, location_label: null },
  });
  expect(r.origin).toBe("profile");
});

test("LocationInputSchema accepts a well-formed fix", () => {
  const ok = LocationInputSchema.parse({
    lat: 52.52, lon: 13.41, label: "Berlin", source: "city", timezone: "Europe/Berlin",
  });
  expect(ok.label).toBe("Berlin");
});

test("LocationInputSchema rejects out-of-range coordinates", () => {
  const bad = { lon: 13.41, label: "Nowhere", source: "geo", timezone: "Europe/Berlin" };
  expect(() => LocationInputSchema.parse({ ...bad, lat: 91 })).toThrow();
  expect(() => LocationInputSchema.parse({ ...bad, lat: -91 })).toThrow();
  expect(() => LocationInputSchema.parse({ lat: 52.52, ...bad, lon: 181 })).toThrow();
});

test("LocationInputSchema rejects an unknown source and an empty label", () => {
  const base = { lat: 52.52, lon: 13.41, label: "Berlin", timezone: "Europe/Berlin" };
  expect(() => LocationInputSchema.parse({ ...base, source: "profile" })).toThrow();
  expect(() => LocationInputSchema.parse({ ...base, source: "geo", label: "" })).toThrow();
});

// ── The shared write payload, and when a change is a change ──────────────────

test("locationColumns rounds coordinates the same way resolveLocation reads them", () => {
  const c = locationColumns(
    { lat: 14.5995123, lon: 120.9842456, label: "Manila", source: "city", timezone: "Asia/Manila" },
    "2026-08-06T12:00:00.000Z",
  );
  // 2dp ~ 1.1km: raw GPS precision makes every forecast URL unique and defeats
  // the 30-minute fetchForecast cache, and stores more precise personal data
  // than we need.
  expect(c.location_lat).toBe(14.6);
  expect(c.location_lon).toBe(120.98);
  expect(c.location_timezone).toBe("Asia/Manila");
  expect(c.location_source).toBe("city");
  expect(c.location_updated_at).toBe("2026-08-06T12:00:00.000Z");
});

test("locationChanged compares ROUNDED coordinates, not raw ones", () => {
  const profile = { location_lat: 14.6, location_lon: 120.98, location_label: "Manila" };
  // Same place to 2dp — re-picking your own city must not count as a change,
  // because a change throws away today's drop.
  expect(locationChanged({ lat: 14.6012, lon: 120.9799 }, profile)).toBe(false);
  expect(locationChanged({ lat: 64.15, lon: -21.94 }, profile)).toBe(true);
});

test("locationChanged is true when nothing is stored yet", () => {
  expect(locationChanged({ lat: 14.6, lon: 120.98 }, null)).toBe(true);
  expect(locationChanged({ lat: 14.6, lon: 120.98 }, { location_lat: null, location_lon: null })).toBe(true);
});

test("a city saved from Settings suppresses the Stylist's silent GPS refresh", () => {
  // setLocation always writes source 'city'. resolveLocation surfaces that as
  // the origin, and stylist.tsx gates its silent refresh on exactly this value
  // (`geoAllowedRef.current = res.weather.locationOrigin !== "city"`). If this
  // ever came back as "profile", GPS would overwrite a deliberate choice on the
  // next load — the bug PR #21 fixed.
  const r = resolveLocation({
    profile: {
      location_lat: 14.6,
      location_lon: 120.98,
      location_label: "Manila",
      location_source: "city",
    },
  });
  expect(r.origin).toBe("city");
  expect(r.label).toBe("Manila");
});
