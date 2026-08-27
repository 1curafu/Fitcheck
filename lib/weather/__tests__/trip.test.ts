import { mapTripForecast } from "../trip";

const raw = {
  daily: {
    time: ["2026-05-12", "2026-05-13", "2026-05-14"],
    temperature_2m_max: [22.4, 19.1, 16.8],
    temperature_2m_min: [14.2, 12.9, 11.1],
    weather_code: [0, 3, 61], // clear, overcast, rain
  },
};

test("maps each day to the weather its look is built for", () => {
  const f = mapTripForecast(raw, ["2026-05-12", "2026-05-13", "2026-05-14"]);
  expect(f.byDate["2026-05-12"]).toEqual({ tempC: 22, highC: 22, lowC: 14, rain: false });
  expect(f.byDate["2026-05-14"].rain).toBe(true);
  expect(f.beyondHorizon).toBe(false);
});

// The look is built for the day's HIGH — the cold end is handled by advice, not
// by putting a coat in every flat-lay. Same rule as the daily drop.
test("builds for the high, not the low", () => {
  const f = mapTripForecast(raw, ["2026-05-13"]);
  expect(f.byDate["2026-05-13"].tempC).toBe(19);
  expect(f.byDate["2026-05-13"].lowC).toBe(13);
});

/**
 * ⚠️ The honesty flag. Open-Meteo forecasts ~16 days; planning a trip three
 * months out is an ordinary thing to do. A capsule built on invented weather is
 * worse than one that admits it does not know — the user would pack for 22°
 * because we showed them 22°, and we would have made that up.
 */
test("flags days past the forecast horizon and stands in with the nearest real day", () => {
  const f = mapTripForecast(raw, ["2026-05-13", "2026-08-01"]);
  expect(f.beyondHorizon).toBe(true);
  // The stand-in is the LAST day the API actually returned (14 May: 17°/11°,
  // rain) — the nearest real data, not an invented average. `byDate` only holds
  // the dates that were asked for, so this asserts the values rather than a key.
  expect(f.byDate["2026-08-01"]).toEqual({ tempC: 17, highC: 17, lowC: 11, rain: true });
});

test("an empty forecast still answers for every date asked", () => {
  const f = mapTripForecast({}, ["2026-05-12"]);
  expect(f.beyondHorizon).toBe(true);
  expect(f.byDate["2026-05-12"]).toBeDefined();
});

// A day the API skipped must not silently inherit its neighbour's date.
test("a gap in the daily arrays does not shift the other days", () => {
  const gappy = {
    daily: {
      time: ["2026-05-12", "2026-05-13"],
      temperature_2m_max: [22.4, undefined as unknown as number],
      temperature_2m_min: [14.2, 12.9],
      weather_code: [0, 0],
    },
  };
  const f = mapTripForecast(gappy, ["2026-05-12", "2026-05-13"]);
  expect(f.byDate["2026-05-12"].highC).toBe(22);
  expect(f.beyondHorizon).toBe(true);
});
