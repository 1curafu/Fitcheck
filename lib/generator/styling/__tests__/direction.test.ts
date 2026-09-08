import { valueDirection, MEANINGFUL_THRESHOLD } from "../direction";
import { CLEAR_SEPARATION } from "../value";

const top = (colors: string[], formality = 3) => ({ category: "Tops", colors, formality });
const bottom = (colors: string[], formality = 3) => ({ category: "Bottoms", colors, formality });

test("light top over dark bottom is the tailoring default", () => {
  // White shirt / navy trousers — named canonical by the research.
  expect(valueDirection([top(["white"]), bottom(["navy"])])).toBe(1);
  expect(valueDirection([top(["cream"]), bottom(["charcoal"])])).toBe(1);
});

test("the SAME two colours score differently the other way round", () => {
  // ⚠️ The whole point. `pairingRating` sorts its key and cannot see this.
  const canon = valueDirection([top(["white"]), bottom(["navy"])])!;
  const inverted = valueDirection([top(["navy"]), bottom(["white"])])!;
  expect(inverted).toBeLessThan(canon);
});

test("a light lower is seasonal, not wrong — it costs only in a dressy look", () => {
  const casual = valueDirection([top(["navy"], 2), bottom(["white"], 2)])!;
  const dressy = valueDirection([top(["navy"], 4), bottom(["white"], 4)])!;
  expect(dressy).toBeLessThan(casual);
  expect(casual).toBeGreaterThan(0.5); // still a normal outfit
});

test("null when neither garment leads", () => {
  // Two close values: the muddy question, which `valueContrast` answers.
  expect(valueDirection([top(["white"]), bottom(["cream"])])).toBeNull();
  expect(valueDirection([top(["navy"]), bottom(["navy"])])).toBeNull();
});

test("null when there is no upper-over-lower pair at all", () => {
  expect(valueDirection([{ category: "One-piece", colors: ["navy"], formality: 4 }])).toBeNull();
  expect(valueDirection([top(["white"])])).toBeNull();
  expect(valueDirection([])).toBeNull();
  // A colour outside the palette contributes no value.
  expect(valueDirection([top(["notacolour"]), bottom(["navy"])])).toBeNull();
});

test("the threshold is the one value contrast uses, not a second hand-picked number", () => {
  // ⚠️ Anchored, not tuned. You cannot say which garment is lighter if the two
  // do not read as different at all, so direction reuses the separation
  // threshold rather than inventing one.
  expect(MEANINGFUL_THRESHOLD).toBe(CLEAR_SEPARATION);
});
