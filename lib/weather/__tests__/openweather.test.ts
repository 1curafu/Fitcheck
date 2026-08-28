import { describe, expect, test } from "vitest";
import {
  isRainId,
  mapOneCall,
  mapOneCallDaily,
  localParts,
  HOURLY_MAX,
  DAILY_MAX,
} from "../openweather";
import currentFixture from "./fixtures/onecall-current.json";
import hourlyFixture from "./fixtures/onecall-1h.json";
import dailyFixture from "./fixtures/onecall-1day.json";

/**
 * Captured live from One Call 4.0 on 2026-08-28 (Berlin, 52.52/13.41).
 * Berlin's centre is a public landmark coordinate, not anyone's home.
 *
 * The fixture's own clock: `current` is 2026-08-28 07:41 local (UTC+2), the
 * hourly series starts 07:00 local, and the daily series starts 2026-08-28.
 */
const bundle = { current: currentFixture, hourly: hourlyFixture, daily: dailyFixture };
const NOW = currentFixture.data[0].dt; // 07:41 local

describe("localParts — unix dt + timezone_offset → local wall clock", () => {
  /**
   * ⚠️ The single sharpest edge in this swap. Open-Meteo returned LOCAL ISO
   * strings (`timezone=auto`), so `open-meteo.ts` could compare them as strings.
   * One Call returns unix `dt` plus a `timezone_offset` in seconds, so the local
   * wall clock has to be derived. Get this wrong and every downstream hour
   * window is silently shifted.
   */
  test("renders the location's wall clock, not the machine's", () => {
    // 2026-08-28T05:00Z with a +7200 offset is 07:00 in Berlin.
    const p = localParts(1787893200, 7200);
    expect(p.hh).toBe("07:00");
    expect(p.date).toBe("2026-08-28");
    expect(p.hour).toBe(7);
  });

  test("rolls the local DATE, not just the hour, across a UTC midnight", () => {
    // 2026-08-28T23:00Z is already 01:00 on the 29th in Berlin. A mapper that
    // took the date from the UTC timestamp would file this under the 28th.
    const p = localParts(1787958000, 7200);
    expect(p.date).toBe("2026-08-29");
    expect(p.hh).toBe("01:00");
  });

  test("handles a negative offset (western hemisphere)", () => {
    // Same instant, Chicago (-5h): still the 28th, but 00:00.
    const p = localParts(1787893200, -18000);
    expect(p.date).toBe("2026-08-28");
    expect(p.hh).toBe("00:00");
  });
});

describe("isRainId — OpenWeather condition ids", () => {
  /**
   * ⚠️ Nothing transfers from Open-Meteo's WMO codes. Verified against the real
   * fixture, which contains 500/501/502 (rain) and 801–804 (cloud).
   */
  test("2xx thunderstorm, 3xx drizzle and 5xx rain are rain", () => {
    expect(isRainId(200)).toBe(true); // thunderstorm
    expect(isRainId(300)).toBe(true); // drizzle
    expect(isRainId(500)).toBe(true); // light rain — present in the fixture
    expect(isRainId(502)).toBe(true);
  });

  test("clear and cloud are not rain", () => {
    expect(isRainId(800)).toBe(false); // clear sky
    expect(isRainId(801)).toBe(false);
    expect(isRainId(804)).toBe(false); // overcast — the fixture's current condition
  });

  /**
   * ⚠️ Deliberate parity with the shipped behaviour: Open-Meteo's RAIN_CODES
   * covered drizzle/rain/showers/thunderstorm and EXCLUDED snow (71–77). The
   * flag drives "take a shell", which is not the advice for snow.
   */
  test("snow is NOT rain — matches what Open-Meteo's set did", () => {
    expect(isRainId(600)).toBe(false);
    expect(isRainId(601)).toBe(false);
  });

  test("a silently-empty rain set would fail this", () => {
    const rainyHours = hourlyFixture.data.filter((h) => isRainId(h.weather[0].id));
    expect(rainyHours.length).toBeGreaterThan(0);
  });
});

describe("mapOneCall — the daily-drop shape", () => {
  test("current reading maps temp, feels-like and condition", () => {
    const w = mapOneCall(bundle, NOW);
    expect(w.tempC).toBe(19); // 18.81 rounded
    expect(w.feelsLikeC).toBe(18); // 18.39 rounded
    expect(w.condition).toMatch(/overcast|cloud/i); // id 804
    expect(w.timezone).toBe("Europe/Berlin");
  });

  test("hourly = 4 forward cells from now, with isNow and per-cell rain", () => {
    const w = mapOneCall(bundle, NOW);
    expect(w.hourly).toHaveLength(4);
    expect(w.hourly[0].hh).toBe("07:00");
    expect(w.hourly[0].isNow).toBe(true);
    expect(w.hourly.slice(1).every((c) => !c.isNow)).toBe(true);
    // 09:00 is id 500 in the fixture.
    expect(w.hourly.find((c) => c.hh === "09:00")!.rain).toBe(true);
    expect(w.hourly.find((c) => c.hh === "08:00")!.rain).toBe(false);
  });

  test("restOfDay stops at local midnight — never bleeds into tomorrow", () => {
    /**
     * ⚠️ The bug `open-meteo.ts` documents: an "evening" window matched on
     * hour-of-day alone happily plans against TOMORROW's 19:00. The 20-hour
     * window from 07:41 reaches into the 29th, so this is live, not theoretical.
     */
    const w = mapOneCall(bundle, NOW);
    expect(w.restOfDay.length).toBeGreaterThan(0);
    const hours = w.restOfDay.map((c) => Number(c.hh.slice(0, 2)));
    // Strictly increasing proves no wrap past midnight into the next day.
    expect(hours).toEqual([...hours].sort((a, b) => a - b));
    expect(Math.max(...hours)).toBeLessThanOrEqual(23);
    expect(hours[0]).toBe(7);
  });

  test("high/low are the peak STILL AHEAD, and never contradict the reading on screen", () => {
    const w = mapOneCall(bundle, NOW);
    const ahead = w.restOfDay.map((c) => c.tempC);
    expect(w.highC).toBe(Math.max(w.tempC, ...ahead));
    expect(w.lowC).toBe(Math.min(w.tempC, ...ahead));
    expect(w.highC).toBeGreaterThanOrEqual(w.tempC);
  });

  test("degrades rather than throws when a block is missing", () => {
    const w = mapOneCall({ current: currentFixture, hourly: { data: [] }, daily: { data: [] } }, NOW);
    expect(w.tempC).toBe(19);
    expect(w.hourly).toEqual([]);
    // With no hours ahead, the range falls back to the current reading.
    expect(w.highC).toBe(19);
    expect(w.lowC).toBe(19);
  });
});

describe("mapOneCallDaily — the trip shape", () => {
  const dates = dailyFixture.data.slice(0, 3).map((d) => localParts(d.dt, 7200).date);

  test("one Weather per requested date, built for the day's HIGH", () => {
    const t = mapOneCallDaily(dailyFixture, dates);
    const first = t.byDate[dates[0]];
    expect(first.highC).toBe(29); // temp.max 28.61
    expect(first.lowC).toBe(19); // temp.min 18.64
    // The look is built for the HIGH — same rule as the daily drop.
    expect(first.tempC).toBe(first.highC);
    expect(first.rain).toBe(true); // id 500
  });

  test("beyondHorizon is false when every date is covered", () => {
    expect(mapOneCallDaily(dailyFixture, dates).beyondHorizon).toBe(false);
  });

  test("beyondHorizon is TRUE past the horizon, and stands in with the nearest real day", () => {
    /**
     * ⚠️ One Call caps at 10 days where Open-Meteo gave 16, so this is now an
     * ordinary case rather than an edge one. Silently rendering a capsule built
     * on invented weather is worse than admitting we do not know.
     */
    const t = mapOneCallDaily(dailyFixture, [...dates, "2027-01-01"]);
    expect(t.beyondHorizon).toBe(true);
    expect(t.byDate["2027-01-01"]).toBeDefined();
  });

  test("an empty daily block does not throw", () => {
    const t = mapOneCallDaily({ data: [] }, dates);
    expect(t.beyondHorizon).toBe(true);
    expect(Object.keys(t.byDate)).toHaveLength(dates.length);
  });

  /**
   * ⚠️ Ported from the Open-Meteo `trip.test.ts` before that file was deleted.
   * A row with a missing temperature must not SHIFT the days after it — every
   * date is keyed off its own `dt`, never off an array index.
   */
  test("a gap in the daily rows does not shift the other days", () => {
    const rows = dailyFixture.data.slice(0, 3).map((d) => ({ ...d }));
    // Knock the middle day's range out, as a partial provider response would.
    const holed = [
      rows[0],
      { ...rows[1], temp: { ...rows[1].temp, max: undefined, min: undefined } },
      rows[2],
    ];
    const t = mapOneCallDaily(
      { timezone_offset: 7200, data: holed as unknown as typeof dailyFixture.data },
      dates,
    );
    // Day 3 still carries DAY 3's numbers, not day 2's shifted along.
    expect(t.byDate[dates[2]].highC).toBe(Math.round(rows[2].temp.max));
    expect(t.beyondHorizon).toBe(true); // the holed day fell through to the stand-in
  });
});

describe("the provider's hard caps — measured, not assumed", () => {
  /**
   * ⚠️ `cnt` above these is silently ignored by the API. Both numbers are load
   * bearing: DAILY_MAX sets the trip horizon, and HOURLY_MAX is SHORTER than a
   * full day, which is why restOfDay can be short when the app is opened after
   * midnight (accepted 2026-08-28 — see the note in openweather.ts).
   */
  test("the fixtures pin the caps this code was written against", () => {
    expect(DAILY_MAX).toBe(10);
    expect(HOURLY_MAX).toBe(20);
    expect(dailyFixture.data).toHaveLength(DAILY_MAX);
    expect(hourlyFixture.data).toHaveLength(HOURLY_MAX);
  });
});
