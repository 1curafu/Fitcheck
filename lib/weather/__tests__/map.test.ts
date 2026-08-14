import { mapForecast, fetchForecast, RAIN_CODES } from "../open-meteo";

const raw = {
  timezone: "Europe/Berlin",
  current: {
    // local time AT THE LOCATION — this is our now-marker, same clock as hourly.time
    time: "2026-01-14T18:00",
    temperature_2m: 14.3,
    apparent_temperature: 12.1,
    weather_code: 3,
  },
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

// --- new: timezone correctness -------------------------------------------------

test("with no nowIso, the now-index comes from raw.current.time — NOT the machine clock", () => {
  const w = mapForecast(raw); // no injected now
  expect(w.hourly[0].hh).toBe("18:00");
  expect(w.hourly[0].isNow).toBe(true);
  expect(w.hourly).toHaveLength(4);
});

test("an explicitly injected nowIso still overrides the default", () => {
  const w = mapForecast(raw, "2026-01-14T20:00");
  expect(w.hourly[0].hh).toBe("20:00");
});

test("the resolved IANA timezone is passed through (server-side scheduling needs it)", () => {
  expect(mapForecast(raw).timezone).toBe("Europe/Berlin");
});

test("fetchForecast asks for timezone=auto and ROUNDS coords so the 30-min cache can hit", async () => {
  const calls: string[] = [];
  const fetchMock = vi.fn(async (url: string) => {
    calls.push(url);
    return { json: async () => raw } as unknown as Response;
  });
  vi.stubGlobal("fetch", fetchMock);

  const w = await fetchForecast(52.5187234, 13.4098765);

  expect(calls[0]).toContain("timezone=auto");
  expect(calls[0]).toContain("latitude=52.52");
  expect(calls[0]).toContain("longitude=13.41");
  expect(calls[0]).not.toContain("52.5187234"); // raw precision never reaches the URL
  expect(w.timezone).toBe("Europe/Berlin");

  vi.unstubAllGlobals();
});

// ── Today's range — what the LOOK is built for ──────────────────────────────
// Reported 2026-08-14: a cable-knit sweater was offered at 07:45 in 20°C for a
// day that reached 34.8°C. The drop is generated once and worn all day, so the
// generator needs the day's high, not the temperature at the moment it ran.

test("the hours still ahead beat the calendar day's block", () => {
  // The daily block is midnight-to-midnight. When there are real hours left,
  // they are the better answer — a 34.8° max that happened at 15:00 says
  // nothing about an outfit chosen at 18:00.
  const withDaily = {
    ...raw,
    daily: { temperature_2m_max: [34.8], temperature_2m_min: [8.2] },
  };
  const w = mapForecast(withDaily, "2026-01-14T18:00");
  const ahead = w.restOfDay.map((h) => h.tempC);
  expect(w.highC).toBe(Math.max(...ahead));
  expect(w.lowC).toBe(Math.min(...ahead));
  expect(w.tempC).toBe(Math.round(raw.current.temperature_2m)); // display is still NOW
});

test("with no daily block the range still comes from the remaining hours", () => {
  const w = mapForecast(raw, "2026-01-14T18:00");
  expect(w.highC).toBe(w.tempC); // 14 now, and it only falls from here
  expect(w.lowC).toBe(10); // 22:00
});

test("the range can never contradict the temperature on screen", () => {
  // A stale daily block against a fresh `current` could otherwise report a high
  // BELOW the number the user is reading, which would look like a bug and would
  // dress them for a colder day than they are standing in.
  const contradictory = {
    ...raw,
    daily: { temperature_2m_max: [-40], temperature_2m_min: [99] },
  };
  const w = mapForecast(contradictory, "2026-01-14T18:00");
  expect(w.highC).toBeGreaterThanOrEqual(w.tempC);
  expect(w.lowC).toBeLessThanOrEqual(w.tempC);
});

// ── The rest of today ───────────────────────────────────────────────────────
// `daily.temperature_2m_max` is midnight-to-midnight, so opening the app at
// 20:00 would plan against a 17:00 peak already lived through. `restOfDay` is
// the hours still ahead, and the high/low now come from it.

test("restOfDay holds only the hours still ahead, and only today's", () => {
  const spanning = {
    ...raw,
    hourly: {
      time: [
        "2026-01-14T16:00", "2026-01-14T17:00", "2026-01-14T18:00",
        "2026-01-14T22:00", "2026-01-15T08:00", "2026-01-15T18:00",
      ],
      temperature_2m: [16, 15, 14, 9, 3, 30],
      weather_code: [3, 3, 3, 3, 3, 3],
      precipitation_probability: [5, 5, 5, 5, 5, 5],
    },
  };
  const w = mapForecast(spanning, "2026-01-14T18:00");
  expect(w.restOfDay.map((h) => h.hh)).toEqual(["18:00", "22:00"]);
  // Tomorrow's 30° must never reach the planning temperature.
  expect(w.highC).toBeLessThan(30);
});

test("the high and low describe what is left of the day, not the calendar day", () => {
  const eveningNow = {
    ...raw,
    current: { ...raw.current, time: "2026-01-14T20:00", temperature_2m: 9 },
    hourly: {
      time: ["2026-01-14T08:00", "2026-01-14T14:00", "2026-01-14T20:00", "2026-01-14T22:00"],
      temperature_2m: [4, 18, 9, 6], // the 18° peak is already gone
      weather_code: [3, 3, 3, 3],
      precipitation_probability: [5, 5, 5, 5],
    },
    daily: { temperature_2m_max: [18], temperature_2m_min: [4] },
  };
  const w = mapForecast(eveningNow, "2026-01-14T20:00");
  expect(w.highC).toBe(9); // NOT 18
  expect(w.lowC).toBe(6);
});

test("with no hourly hours left, the daily block is the fallback", () => {
  const exhausted = {
    ...raw,
    hourly: { time: [], temperature_2m: [], weather_code: [], precipitation_probability: [] },
    daily: { temperature_2m_max: [21], temperature_2m_min: [2] },
  };
  const w = mapForecast(exhausted, "2026-01-14T18:00");
  expect(w.highC).toBe(21);
  expect(w.lowC).toBe(2);
});
