import { mapSearch, pickLabel } from "../geocode";

test("maps geocoding results to {name,country,lat,lon} (renames latitude/longitude)", () => {
  const rows = mapSearch({
    results: [
      { name: "Berlin", country: "Germany", latitude: 52.52, longitude: 13.41 },
      { name: "Munich", country: "Germany", latitude: 48.14, longitude: 11.58 },
    ],
  });
  expect(rows[0]).toEqual({ name: "Berlin", country: "Germany", lat: 52.52, lon: 13.41 });
  expect(rows).toHaveLength(2);
});
test("no match → Open-Meteo OMITS the `results` key → []", () => {
  expect(mapSearch({ generationtime_ms: 0.12 } as never)).toEqual([]); // NOT { results: [] }
});
test("label is the bare city name", () => {
  expect(pickLabel({ name: "Berlin", country: "Germany", lat: 52.52, lon: 13.41 })).toBe("Berlin");
});
