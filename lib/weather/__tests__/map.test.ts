import { mapForecast, RAIN_CODES } from "../open-meteo";
const raw = {
  current: { temperature_2m: 14.3, apparent_temperature: 12.1, weather_code: 3 },
  hourly: {
    // 1-hour steps; NOTE now (18:00) is index 2, not 0 — proves forward-slice-from-now
    time: [
      "2026-01-14T16:00", "2026-01-14T17:00", "2026-01-14T18:00", "2026-01-14T19:00",
      "2026-01-14T20:00", "2026-01-14T21:00", "2026-01-14T22:00",
    ],
    temperature_2m: [16, 15, 14, 13, 12, 11, 10],
    weather_code: [3, 3, 3, 3, 3, 61, 61],
    precipitation_probability: [5, 8, 10, 20, 30, 80, 75],
  },
};
test("maps current temp (rounded), feels-like, and condition", () => {
  const w = mapForecast(raw, "2026-01-14T18:00");
  expect(w.tempC).toBe(14);
  expect(w.feelsLikeC).toBe(12);
  expect(w.condition).toMatch(/overcast|cloud/i);
});
test("hourly = 4 forward cells FROM the now index (pre-now excluded), with isNow + per-cell temp + rain", () => {
  const w = mapForecast(raw, "2026-01-14T18:00");
  expect(w.hourly).toHaveLength(4);
  expect(w.hourly[0].hh).toBe("18:00");
  expect(w.hourly[0].isNow).toBe(true);
  expect(w.hourly.map((c) => c.hh)).not.toContain("16:00"); // pre-now hours dropped
  expect(w.hourly.map((c) => c.hh)).not.toContain("17:00");
  expect(w.hourly.find((c) => c.hh === "21:00")!.rain).toBe(true);
  expect(w.hourly.find((c) => c.hh === "21:00")!.tempC).toBe(11); // per-cell temp mapped
});
test("rain weather codes are classified as rain", () => {
  expect(RAIN_CODES.has(61)).toBe(true);
  expect(RAIN_CODES.has(0)).toBe(false);
});
