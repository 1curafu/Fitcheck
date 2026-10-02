// lib/weather/__tests__/cold-nights.test.ts
import { coldNights } from "../trip";

const w = (highC: number, lowC: number) => ({ tempC: highC, rain: false, highC, lowC });

test("a mild day with a cold night gets the note; the coldest low is reported", () => {
  expect(coldNights({ a: w(17, 3), b: w(20, 6), c: w(22, 12) })).toEqual({ lowC: 3 });
});
test("thresholds: low 8 yes / 9 no; high 15 yes / 14 no (a colder day already gets a coat)", () => {
  expect(coldNights({ a: w(18, 8) })).toEqual({ lowC: 8 });
  expect(coldNights({ a: w(18, 9) })).toBeNull();
  expect(coldNights({ a: w(15, 2) })).toEqual({ lowC: 2 });
  expect(coldNights({ a: w(14, 2) })).toBeNull();
});
test("no days, or days without a low, give no note", () => {
  expect(coldNights({})).toBeNull();
  expect(coldNights({ a: { tempC: 20, rain: false } })).toBeNull();
});
