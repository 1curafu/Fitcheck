import { COLOR_NAMES } from "@/lib/ai/tagging-schema";
import { COLOUR_TEMPERATURE, temperatureOf, WARM_WEATHER_ONLY } from "../colour-table";

test("every one of the 39 colours has a temperature", () => {
  for (const name of COLOR_NAMES) {
    expect(COLOUR_TEMPERATURE[name]).toBeDefined();
  }
});

test("the table invents no colour outside the vocabulary", () => {
  for (const key of Object.keys(COLOUR_TEMPERATURE)) {
    expect(COLOR_NAMES).toContain(key);
  }
});

// The defect this whole plan exists to fix: these two are indistinguishable today.
test("cream is warm and white is cool", () => {
  expect(temperatureOf("cream")).toBe("warm");
  expect(temperatureOf("white")).toBe("cool");
});

test("stone is the documented exception in a warm beige family", () => {
  expect(temperatureOf("stone")).toBe("cool");
  expect(temperatureOf("beige")).toBe("warm");
});

test("lookup is case- and whitespace-insensitive, like isNeutral", () => {
  expect(temperatureOf(" Navy ")).toBe("cool");
});

test("an unknown colour reads neutral rather than throwing", () => {
  expect(temperatureOf("chartreuse")).toBe("neutral");
});

test("white and cream trousers are seasonally gated; navy is not", () => {
  expect(WARM_WEATHER_ONLY.has("white")).toBe(true);
  expect(WARM_WEATHER_ONLY.has("cream")).toBe(true);
  expect(WARM_WEATHER_ONLY.has("navy")).toBe(false);
});
