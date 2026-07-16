import { fcRise, fcFade } from "../motion";

test("fcRise lifts from translateY 16 and fades in", () => {
  expect(fcRise.hidden).toMatchObject({ opacity: 0, y: 16 });
  expect(fcRise.visible).toMatchObject({ opacity: 1, y: 0 });
});

test("fcFade fades opacity only", () => {
  expect(fcFade.hidden).toMatchObject({ opacity: 0 });
  expect(fcFade.visible).toMatchObject({ opacity: 1 });
});
