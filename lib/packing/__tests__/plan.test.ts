import { expandDays } from "../plan";

test("expands a date range into one day per date", () => {
  const days = expandDays("2026-05-12", "2026-05-14", { work: 3 });
  expect(days.map((d) => d.date)).toEqual(["2026-05-12", "2026-05-13", "2026-05-14"]);
});

test("assigns occasions in the mix's declared proportion", () => {
  const days = expandDays("2026-05-12", "2026-05-18", { work: 3, everyday: 2, evening: 2 });
  const counts = days.reduce<Record<string, number>>((a, d) => {
    a[d.occasion] = (a[d.occasion] ?? 0) + 1;
    return a;
  }, {});
  expect(counts).toEqual({ work: 3, everyday: 2, evening: 2 });
});

/**
 * ⚠️ Determinism. A stored capsule is re-read all week and its days must not
 * shuffle underneath it — that is Decision 5's whole premise, and the reason
 * the solve processes days in order.
 */
test("is deterministic", () => {
  const a = expandDays("2026-05-12", "2026-05-18", { work: 3, everyday: 2, evening: 2 });
  const b = expandDays("2026-05-12", "2026-05-18", { work: 3, everyday: 2, evening: 2 });
  expect(a).toEqual(b);
});

// A mix that does not add up to the date range is the NORMAL case while the
// user is still adjusting the steppers. It must never throw.
test("pads with everyday when the mix is short", () => {
  expect(expandDays("2026-05-12", "2026-05-14", { work: 1 }).map((d) => d.occasion)).toEqual([
    "work",
    "everyday",
    "everyday",
  ]);
});

test("truncates when the mix is longer than the trip", () => {
  expect(expandDays("2026-05-12", "2026-05-13", { work: 5 })).toHaveLength(2);
});

test("a single-day trip is one day", () => {
  expect(expandDays("2026-05-12", "2026-05-12", { work: 1 })).toHaveLength(1);
});

// Zero counts are what the steppers produce when a user dials an occasion out;
// they must not create phantom days.
test("ignores occasions set to zero", () => {
  const days = expandDays("2026-05-12", "2026-05-13", { work: 2, weekend: 0 });
  expect(days.every((d) => d.occasion === "work")).toBe(true);
});

// An end before the start is a date-picker mistake, not a crash.
test("an inverted range yields no days", () => {
  expect(expandDays("2026-05-14", "2026-05-12", { work: 1 })).toEqual([]);
});

// ⚠️ Crossing a month boundary must not produce "2026-05-32".
test("crosses a month boundary correctly", () => {
  const days = expandDays("2026-05-30", "2026-06-02", { work: 4 });
  expect(days.map((d) => d.date)).toEqual(["2026-05-30", "2026-05-31", "2026-06-01", "2026-06-02"]);
});

// ⚠️ And a DST boundary, because the dates are local calendar days rather than
// instants. `lib/outfits/local-date.ts` exists for exactly this class of bug.
test("crosses a DST boundary without dropping or repeating a day", () => {
  const days = expandDays("2026-03-28", "2026-03-31", { work: 4 });
  expect(days.map((d) => d.date)).toEqual(["2026-03-28", "2026-03-29", "2026-03-30", "2026-03-31"]);
});

import { realBuilder } from "../plan";
import type { CandidateItem } from "@/lib/generator/candidates";
import type { Weather } from "@/lib/generator/rules";

const item = (id: string, category: string, extra: Partial<CandidateItem> = {}): CandidateItem => ({
  id,
  category,
  colors: ["navy"],
  formality: 3,
  seasons: ["Spring", "Summer", "Autumn", "Winter"],
  material: "Cotton",
  texture: "Flat",
  pattern: "solid",
  ...extra,
});

const closet: CandidateItem[] = [
  item("shirt", "Tops"),
  item("trouser", "Bottoms", { colors: ["charcoal"] }),
  item("loafer", "Shoes", { colors: ["brown"] }),
];

const mild: Weather = { tempC: 19, rain: false, highC: 22, lowC: 14 };

describe("realBuilder", () => {
  test("builds a scored outfit from the real generator", () => {
    const build = realBuilder(closet, () => mild);
    const out = build({ date: "2026-05-12", occasion: "work" }, closet);
    expect(out).not.toBeNull();
    expect(out!.itemIds).toHaveLength(3);
    expect(out!.score).toBeGreaterThan(0);
    expect(out!.score).toBeLessThanOrEqual(1);
  });

  // The solve narrows `available` as wear limits bite; the builder must honour
  // that rather than reaching back into the full closet behind its back.
  test("only uses what it was offered", () => {
    const build = realBuilder(closet, () => mild);
    const out = build({ date: "2026-05-12", occasion: "work" }, [closet[0], closet[1]]);
    expect(out).toBeNull(); // no shoes offered → no outfit
  });

  test("an empty pool builds nothing", () => {
    const build = realBuilder(closet, () => mild);
    expect(build({ date: "2026-05-12", occasion: "work" }, [])).toBeNull();
  });

  /**
   * ⚠️ The forecast is read PER DAY, not once for the trip. The generator audit
   * found one defect in three places from reading a single moment for a look
   * worn all day — a week-long trip makes that worse, not better.
   */
  test("asks for the forecast of the day it is building", () => {
    const asked: string[] = [];
    const build = realBuilder(closet, (date) => {
      asked.push(date);
      return mild;
    });
    build({ date: "2026-05-12", occasion: "work" }, closet);
    build({ date: "2026-05-13", occasion: "evening" }, closet);
    expect(asked).toEqual(["2026-05-12", "2026-05-13"]);
  });
});

/**
 * ⚠️ The bug that reached real data: `rankTopN` subtracts up to RECENT_WEIGHT
 * (0.25) for repeated pieces, and the solve compares the returned score against
 * QUALITY_FLOOR (0.7). Returning the penalised number sank a repeated outfit
 * below the floor and made the solve buy a piece to escape its own nudge.
 */
test("the recency preference orders without lowering the reported score", () => {
  const build = realBuilder(closet, () => mild);
  const day = { date: "2026-05-12", occasion: "work" };

  const fresh = build(day, closet);
  const repeating = build(day, closet, fresh!.itemIds);

  expect(repeating).not.toBeNull();
  // Same pool and no alternative, so the same outfit — and crucially the SAME
  // score. A lower one here is the inflation bug.
  expect(repeating!.score).toBeCloseTo(fresh!.score, 5);
});
