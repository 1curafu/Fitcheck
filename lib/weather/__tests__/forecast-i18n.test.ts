import { createTranslator } from "next-intl";
import { expect, it, vi } from "vitest";
import enUS from "@/messages/en-US.json";
import uk from "@/messages/uk.json";
import { cachedSeries, type CacheStore } from "../cache";
import { conditionKey } from "../condition";
import { laterAdvice } from "../advice";

it("different display locales share one numeric weather cache fill", async () => {
  const rows = new Map();
  const store: CacheStore = { read: async () => rows, write: vi.fn(async entries => {
    for (const entry of entries) rows.set(entry.day, { payload: entry.payload, fetchedAt: entry.fetchedAt });
  }) };
  const now = new Date("2026-09-28T12:00:00Z"), dt = now.getTime() / 1000;
  const fetchers = { daily: vi.fn(async () => ({ timezone: "UTC", data: [{ dt, temp: { min: 12, max: 20 }, weather: [{ id: 800 }] }] })),
    hourly: vi.fn(async () => ({ timezone: "UTC", data: [] })) };
  const values = [];
  for (const [locale, messages] of [["uk", uk], ["en-US", enUS]] as const) {
    const series = await cachedSeries({ lat: 47.371, lon: 8.541, dates: ["2026-09-28"], store, now, ...fetchers });
    const payload = series.get("2026-09-28")!;
    const t = createTranslator({ locale, messages, namespace: "weather" });
    values.push(t(`conditions.${conditionKey(payload.daily!.conditionId)}`));
    expect(payload).toMatchObject({ timezone: "UTC", daily: { max: 20, min: 12, conditionId: 800 } });
    expect(payload).not.toHaveProperty("locale");
  }
  expect(values).toEqual(["Ясно", "Clear"]);
  expect(store.write).toHaveBeenCalledOnce();
  expect(fetchers.daily).toHaveBeenCalledOnce();
});

const branches = [
  { now: 20, last: 20, high: 20, rain: true, lead: "rainFrom", clause: "takeShell" },
  { now: 12, last: 5, high: 12, rain: false, lead: "downTonight", clause: "keepCoat" },
  { now: 12, last: 12, high: 12, rain: false, lead: "coldDay", clause: "coatEarns" },
  { now: 8, last: 18, high: 18, rain: false, lead: "upLater", clause: "takeLayer" },
  { now: 20, last: 26, high: 26, rain: false, lead: "upAfternoon", clause: "dressedForIt" },
  { now: 20, last: 10, high: 20, rain: false, lead: "downTonight", clause: "carryJacket" },
  { now: 20, last: 20, high: 20, rain: false, lead: "dryEvening", clause: "noLayer" },
];
it.each(["en-US", "en-GB", "uk"] as const)("%s preserves every advice branch and its emphasized clause", locale => {
  const messages = locale === "uk" ? uk : enUS;
  const t = createTranslator({ locale, messages, namespace: "weather.advice" });
  for (const branch of branches) {
    const cells = [{ hh: "12:00", tempC: branch.now, rain: false, isNow: true }, { hh: "21:00", tempC: branch.last, rain: branch.rain, isNow: false }];
    const copy = laterAdvice(cells, "F", branch.high, locale);
    expect(copy).toMatchObject({ leadKey: branch.lead, clauseKey: branch.clause });
    const clause = t(copy.clauseKey);
    const sentence = `${t(copy.leadKey, copy.leadValues)} — ${clause}`;
    expect(sentence).toContain(clause);
    expect(sentence).not.toContain("weather.advice.");
    expect(cells.map(cell => cell.tempC)).toEqual([branch.now, branch.last]);
  }
});
