import { roundCoord, resolveLocation, DEFAULT_LOCATION, LocationInputSchema } from "../location";

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
