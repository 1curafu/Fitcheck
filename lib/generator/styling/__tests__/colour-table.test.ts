import { COLOR_NAMES } from "@/lib/ai/tagging-schema";
import { COLOUR_TEMPERATURE, temperatureOf, WARM_WEATHER_ONLY } from "../colour-table";

test("every one of the 42 colours has a temperature", () => {
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
// ⚠️ The row this table was built for, and it SURVIVES the achromatic change:
// cream is white with a yellow undertone and stays warm, while plain white is
// now neutral rather than cool. "Not warm" and "cool" are different answers, and
// keeping them apart is what makes a cream shoe and a white one score
// differently — the original reason this file exists.
test("cream is warm and white is neutral", () => {
  expect(temperatureOf("cream")).toBe("warm");
  expect(temperatureOf("ivory")).toBe("warm");
  expect(temperatureOf("white")).toBe("neutral");
});

test("the achromatics cast no temperature vote", () => {
  for (const c of ["black", "charcoal", "grey", "silver", "white"]) {
    expect(temperatureOf(c)).toBe("neutral");
  }
});

test("stone and denim are neutral: labels too broad to vote", () => {
  // stone is a grey-beige, denim covers cold indigo and warm faded washes.
  expect(temperatureOf("stone")).toBe("neutral");
  expect(temperatureOf("denim")).toBe("neutral");
  // The colours either side of them are unaffected.
  expect(temperatureOf("beige")).toBe("warm");
  expect(temperatureOf("indigo")).toBe("cool"); // the way to say "cool denim"
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
