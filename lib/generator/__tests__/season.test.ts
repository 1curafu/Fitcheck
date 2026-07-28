import { currentSeason, inSeason, seasonFit } from "../season";

test("matches case-insensitively — the DB stores Title case, fixtures use lower", () => {
  expect(inSeason(["Winter"], "winter")).toBe(true);
  expect(inSeason(["spring"], "Spring")).toBe(true);
});

test("an item tagged for other seasons is out of season", () => {
  expect(inSeason(["Spring", "Summer", "Autumn"], "Winter")).toBe(false);
});

test("an untagged item is never penalised — no tags means no opinion", () => {
  expect(inSeason([], "Winter")).toBe(true);
  expect(inSeason(undefined, "Winter")).toBe(true);
});

test("with no season context nothing is out of season", () => {
  expect(inSeason(["Summer"], undefined)).toBe(true);
});

test("seasonFit is the fraction of pieces that suit the season", () => {
  const items = [
    { seasons: ["Winter"] },
    { seasons: ["Winter"] },
    { seasons: ["Summer"] },
    { seasons: ["Summer"] },
  ];
  expect(seasonFit(items, "Winter")).toBe(0.5);
  expect(seasonFit([{ seasons: ["Winter"] }], "Winter")).toBe(1);
  expect(seasonFit([{ seasons: ["Summer"] }], "Winter")).toBe(0);
});

test("seasonFit of an empty combo is 1, not NaN", () => {
  expect(seasonFit([], "Winter")).toBe(1);
});

test("currentSeason maps months to Title-case seasons", () => {
  expect(currentSeason(new Date("2026-01-15T12:00:00Z"))).toBe("Winter");
  expect(currentSeason(new Date("2026-03-15T12:00:00Z"))).toBe("Spring");
  expect(currentSeason(new Date("2026-07-15T12:00:00Z"))).toBe("Summer");
  expect(currentSeason(new Date("2026-10-15T12:00:00Z"))).toBe("Autumn");
  expect(currentSeason(new Date("2026-12-15T12:00:00Z"))).toBe("Winter");
});
