import { toStoredTrip } from "../store";

const row = {
  id: "trip-1",
  destination_label: "Lisbon, Portugal",
  lat: 38.72,
  lon: -9.14,
  timezone: "Europe/Lisbon",
  start_date: "2026-05-12",
  end_date: "2026-05-18",
  occasion_mix: { work: 3, everyday: 2, evening: 2 },
  rewear_level: 3,
};

test("maps a row and its capsule into the domain shape", () => {
  const t = toStoredTrip(row, [{ itemId: "a", pinned: true }]);
  expect(t.destinationLabel).toBe("Lisbon, Portugal");
  expect(t.occasionMix).toEqual({ work: 3, everyday: 2, evening: 2 });
  expect(t.capsule).toEqual([{ itemId: "a", pinned: true }]);
});

/**
 * ⚠️ `occasion_mix` is jsonb, so it arrives as `unknown`. A malformed value must
 * yield an empty mix — which `expandDays` pads — rather than throwing halfway
 * through rendering a trip the user has already planned and is standing in an
 * airport looking at.
 */
describe("a malformed occasion_mix degrades instead of throwing", () => {
  test("null", () => {
    expect(toStoredTrip({ ...row, occasion_mix: null }, []).occasionMix).toEqual({});
  });
  test("a string", () => {
    expect(toStoredTrip({ ...row, occasion_mix: "work" }, []).occasionMix).toEqual({});
  });
  test("non-numeric values are dropped, valid ones kept", () => {
    const t = toStoredTrip({ ...row, occasion_mix: { work: 3, evening: "two" } }, []);
    expect(t.occasionMix).toEqual({ work: 3 });
  });
  test("zero and negative counts are dropped", () => {
    const t = toStoredTrip({ ...row, occasion_mix: { work: 3, weekend: 0, evening: -1 } }, []);
    expect(t.occasionMix).toEqual({ work: 3 });
  });
  test("a fractional count is floored rather than rejected", () => {
    expect(toStoredTrip({ ...row, occasion_mix: { work: 2.7 } }, []).occasionMix).toEqual({ work: 2 });
  });
});

test("an empty capsule is a valid trip — it is the shortfall case", () => {
  expect(toStoredTrip(row, []).capsule).toEqual([]);
});
