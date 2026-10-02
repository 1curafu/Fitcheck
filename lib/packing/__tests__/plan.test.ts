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

import { realBuilder, tripPlanner } from "../plan";
import type { CandidateItem } from "@/lib/generator/candidates";
import type { Weather } from "@/lib/generator/rules";
import { rankTopN } from "@/lib/generator/rank";
import { scoreCombo } from "@/lib/generator/score";
import { QUALITY_FLOOR, solveCapsule } from "../capsule";

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

// Real scores straddle the floor; Mono/Oversized reverses the two tops' order.
const floorCloset = [
  item("preferred", "Tops", { colors: ["black"], formality: 2, fit: "Oversized", pattern: "striped" }),
  item("qualified", "Tops", { colors: ["burgundy"], formality: 2, fit: "Regular", pattern: "striped" }),
  item("bottom", "Bottoms", { colors: ["olive"], formality: 4, fit: "Regular", pattern: "striped" }),
  item("shoe", "Shoes", { colors: ["tan"] }),
];
const floorDay = { date: "2026-05-12", occasion: "work" };
const floorPrefs = { palette: "Mono", fitPref: "Oversized" };
const floorCtx = { aesthetic: [], band: [2, 4.5] as [number, number], tempC: mild.highC };

describe("realBuilder", () => {
  test("selects the highest-ranked floor-qualified alternative to a preferred sub-floor look", () => {
    const preferred = [floorCloset[0], ...floorCloset.slice(2)];
    const qualified = [floorCloset[1], ...floorCloset.slice(2)];
    expect(scoreCombo(preferred, floorCtx)).toBeLessThan(QUALITY_FLOOR);
    expect(scoreCombo(qualified, floorCtx)).toBeGreaterThanOrEqual(QUALITY_FLOOR);
    expect(rankTopN([preferred, qualified], { ...floorCtx, ...floorPrefs }, 2)[0].items).toEqual(preferred);

    const out = realBuilder(floorCloset, () => mild, floorPrefs)(floorDay, floorCloset);
    expect(out?.itemIds).toEqual(["qualified", "bottom", "shoe"]);
    expect(out?.score).toBe(scoreCombo(qualified, floorCtx));
  });

  test("keeps trip days covered from packed pieces when the preference winner misses the floor", () => {
    const days = [floorDay, { date: "2026-05-13", occasion: "work" }];
    const result = solveCapsule({
      closet: floorCloset, days, level: 5, floor: QUALITY_FLOOR,
      pinned: floorCloset.map((i) => i.id),
      build: realBuilder(floorCloset, () => mild, floorPrefs),
    });
    expect(result.uncovered).toEqual([]);
    expect(result.covered.map((d) => d.itemIds)).toEqual([
      ["qualified", "bottom", "shoe"], ["qualified", "bottom", "shoe"],
    ]);
  });

  test("preferences still choose between looks that both qualify", () => {
    const pool = floorCloset.map((i) => ({ ...i, pattern: "solid" }));
    const plain = realBuilder(pool, () => mild)(floorDay, pool);
    const steered = realBuilder(pool, () => mild, floorPrefs)(floorDay, pool);
    expect(plain?.itemIds).toContain("qualified");
    expect(steered?.itemIds).toContain("preferred");
    expect(plain!.score).toBeGreaterThanOrEqual(QUALITY_FLOOR);
    expect(steered!.score).toBeGreaterThanOrEqual(QUALITY_FLOOR);
  });

  test("a closet with no floor-qualified outfit still leaves the day uncovered", () => {
    const pool = floorCloset.filter((i) => i.id !== "qualified");
    const build = realBuilder(pool, () => mild, floorPrefs);
    expect(build(floorDay, pool)?.score).toBeLessThan(QUALITY_FLOOR);
    const result = solveCapsule({ closet: pool, days: [floorDay], level: 5, floor: QUALITY_FLOOR, build });
    expect(result.covered).toEqual([]);
    expect(result.uncovered).toEqual([floorDay]);
  });

  test("builds a scored outfit from the real generator", () => {
    const build = realBuilder(closet, () => mild);
    const out = build({ date: "2026-05-12", occasion: "work" }, closet);
    expect(out).not.toBeNull();
    expect(out!.itemIds).toHaveLength(3);
    expect(out!.score).toBeGreaterThan(0);
    expect(out!.score).toBeLessThanOrEqual(1);
  });

  test("a trip look never pairs two denim garments when double denim is a no-go", () => {
    const denim = [
      item("jacket", "Outerwear", { material: "Denim" }),
      item("jeans", "Bottoms", { material: "Denim" }),
      item("tee", "Tops"),
      item("loafer", "Shoes"),
    ];
    const chilly: Weather = { tempC: 8, rain: false, highC: 9, lowC: 4 };
    const build = (nogos: ("double_denim")[]) =>
      realBuilder(denim, () => chilly, { nogos })({ date: "2026-05-12", occasion: "everyday" }, denim);
    const free = build([]);
    expect(free?.itemIds).toEqual(expect.arrayContaining(["jacket", "jeans"]));
    const ruled = build(["double_denim"]);
    // Non-null: the cold-day zero-looks bug (a no-go turning "the only coat is denim" into no look at all) came back
    // as `null` and this test used to accept it. The day is dressed, just without the jacket.
    expect(ruled).not.toBeNull();
    expect(ruled!.itemIds).toEqual(expect.arrayContaining(["jeans", "tee", "loafer"]));
    expect(ruled!.itemIds).not.toContain("jacket");
  });

  test("the quality-floor score ignores palette and fit — a soft preference must not push a good look under the hard floor", () => {
    // ⚠️ Opus review: the floor (QUALITY_FLOOR 0.7) was calibrated without these terms; including them cost a coherent look
    // up to ~12% of its score, so Mono + Oversized users saw 12.5% of good outfits fall under it. Rank WITH the
    // preferences, but report the floor score WITHOUT them — the same way recency is excluded.
    const off = [
      item("shirt", "Tops", { colors: ["red"], fit: "Regular" }),
      item("trouser", "Bottoms", { colors: ["olive"], fit: "Regular" }),
      item("loafer", "Shoes", { colors: ["tan"] }),
    ];
    const day = { date: "2026-05-12", occasion: "work" };
    const plain = realBuilder(off, () => mild)(day, off);
    const steered = realBuilder(off, () => mild, { palette: "Mono", fitPref: "Oversized" })(day, off);
    expect(plain).not.toBeNull();
    expect(steered!.score).toBe(plain!.score);
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

describe("trip comfort (spec §2–§4)", () => {
  const knit = item("knit", "Tops", { colors: ["grey"], material: "Cotton", texture: "Cable knit", seasons: ["Autumn", "Winter"] });
  const linen = item("linen", "Tops", { colors: ["white"], material: "Linen", texture: "Flat", seasons: ["Summer"] });
  const chino = item("chino", "Bottoms", { colors: ["stone"] });
  const chino2 = item("chino2", "Bottoms", { colors: ["navy"] });
  const loafer = item("loafer", "Shoes", { colors: ["brown"], material: "Leather" });
  const loafer2 = item("loafer2", "Shoes", { colors: ["black"], material: "Leather" });
  const cold: Weather = { tempC: 4, rain: false, highC: 6, lowC: 1 };
  const hot: Weather = { tempC: 30, rain: false, highC: 32, lowC: 24 };
  const day = (date: string, occasion = "everyday") => ({ date, occasion });

  test("a packed knit is not worn at 32 °C when the closet has a linen top — and only the top is added", () => {
    const closetH = [knit, linen, chino, chino2, loafer, loafer2];
    const forecast: Record<string, Weather> = { "2026-05-12": cold, "2026-05-13": hot };
    const p = tripPlanner(closetH, (d) => forecast[d]);
    const r = solveCapsule({ closet: closetH, days: [day("2026-05-12"), day("2026-05-13")], level: 5, floor: QUALITY_FLOOR,
      build: p.build, usableToday: p.usableToday, requiredToday: p.requiredToday });
    const d1 = r.covered.find((c) => c.day.date === "2026-05-12")!.itemIds;
    const d2 = r.covered.find((c) => c.day.date === "2026-05-13")!.itemIds;
    expect(d1).toContain("knit");              // precondition: the cold day packs the knit (else this test proves nothing)
    expect(d2).not.toContain("knit");
    expect(d2).toContain("linen");
    expect(r.itemIds.filter((id) => id.startsWith("chino"))).toHaveLength(1);
    expect(r.itemIds.filter((id) => id.startsWith("loafer"))).toHaveLength(1);
  });

  test("a packed subset cannot relieve a weather bar the whole closet would not (suede in the rain, leather at home)", () => {
    const tee = item("tee", "Tops");
    const suede = item("suede", "Shoes", { material: "Suede", colors: ["tan"] });
    const leather = item("leather", "Shoes", { material: "Leather", colors: ["brown"] });
    const rain: Weather = { tempC: 14, rain: true, highC: 16, lowC: 10 };
    const p = tripPlanner([tee, chino, suede, leather], () => rain);
    const all = [tee, chino, suede, leather];
    expect(p.usableToday(day("2026-05-12"), "suede", all)).toBe(false);
    expect(p.build(day("2026-05-12"), [tee, chino, suede], undefined, { reference: all })).toBeNull();
  });

  test("D3: relief at the closet level is honoured — a knit-only closet is still dressed at 32 °C", () => {
    const only = [knit, chino, loafer];
    const p = tripPlanner(only, () => hot);
    expect(p.build(day("2026-05-13"), only, undefined, { reference: only })?.itemIds).toContain("knit");
  });

  test("the reference is capacity-aware: with the linen top worn out (absent from the reference) the knit is allowed", () => {
    const p = tripPlanner([knit, linen, chino, loafer], () => hot);
    expect(p.usableToday(day("2026-05-13"), "knit", [knit, chino, loafer])).toBe(true);
    expect(p.usableToday(day("2026-05-13"), "knit", [knit, linen, chino, loafer])).toBe(false);
  });

  test("the usable-today memo keys on date, occasion and the reference — a cold day's answer is never reused on a hot day", () => {
    const forecast: Record<string, Weather> = { "2026-05-12": cold, "2026-05-13": hot };
    const p = tripPlanner([knit, linen, chino, loafer], (d) => forecast[d]);
    const ref = [knit, linen, chino, loafer];
    expect(p.usableToday(day("2026-05-12"), "knit", ref)).toBe(true);
    expect(p.usableToday(day("2026-05-13"), "knit", ref)).toBe(false);
  });

  test("a cold day requires outerwear only when the closet has a usable coat", () => {
    const coat = item("coat", "Outerwear", { material: "Wool", texture: "Twill", colors: ["camel"] });
    const withCoat = tripPlanner([linen, chino, loafer, coat], () => cold);
    expect(withCoat.requiredToday(day("2026-05-12"), [linen, chino, loafer, coat])).toEqual(["Outerwear"]);
    expect(withCoat.requiredToday(day("2026-05-12"), [linen, chino, loafer])).toEqual([]);
    const mildP = tripPlanner([linen, chino, loafer, coat], () => mild);
    expect(mildP.requiredToday(day("2026-05-12"), [linen, chino, loafer, coat])).toEqual([]);
  });

  test("'pack light' with three mild days and a 2 °C day packs a coat for the cold day", () => {
    const tee = item("tee", "Tops");
    const coat = item("coat", "Outerwear", { material: "Wool", texture: "Twill", colors: ["camel"] });
    const closetC = [tee, chino, loafer, coat];
    const two: Weather = { tempC: 1, rain: false, highC: 2, lowC: -1 };
    const forecast: Record<string, Weather> = { "2026-05-12": mild, "2026-05-13": mild, "2026-05-14": mild, "2026-05-15": two };
    const p = tripPlanner(closetC, (d) => forecast[d]);
    const r = solveCapsule({ closet: closetC, days: ["12", "13", "14", "15"].map((n) => day(`2026-05-${n}`)), level: 5, floor: QUALITY_FLOOR,
      build: p.build, usableToday: p.usableToday, requiredToday: p.requiredToday });
    expect(r.uncovered).toHaveLength(0);
    expect(r.covered.find((c) => c.day.date === "2026-05-15")!.itemIds).toContain("coat");
  });

  test("realBuilder is tripPlanner(...).build — existing callers are unchanged", () => {
    const b = realBuilder(closet, () => mild);
    expect(b(day("2026-05-12", "work"), closet)).not.toBeNull(); // no ctx: the offered pool is its own reference (old behaviour)
  });
});

test("trips follow the user's dress codes, and fall back to the occasion's band when they do not overlap", () => {
  const tee = item("tee", "Tops", { formality: 2 });
  const shirt = item("shirt", "Tops", { formality: 4 });
  const ref = [tee, shirt, item("trouser", "Bottoms", { formality: 4 }), item("loafer", "Shoes", { formality: 4 })];
  const work = { date: "2026-05-12", occasion: "work" };
  expect(tripPlanner(ref, () => mild).usableToday(work, "tee", ref)).toBe(true);
  expect(tripPlanner(ref, () => mild, { dressCodes: { formality_min: 4, formality_max: 4 } }).usableToday(work, "tee", ref)).toBe(false);
  // personalBand's own fallback: no overlap → the occasion band, so a trip is never emptied by dress codes (D3)
  const everyday = { date: "2026-05-12", occasion: "everyday" };
  expect(tripPlanner(ref, () => mild, { dressCodes: { formality_min: 5, formality_max: 5 } }).usableToday(everyday, "tee", ref)).toBe(true);
});
