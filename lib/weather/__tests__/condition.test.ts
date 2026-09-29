import { expect, it } from "vitest";
import { conditionKey } from "../condition";
it.each([
  [200, "rain"], [299, "rain"], [300, "rain"], [399, "rain"], [500, "rain"], [599, "rain"],
  [600, "snow"], [699, "snow"], [800, "clear"], [801, "partlyCloudy"], [802, "partlyCloudy"],
  [803, "overcast"], [804, "overcast"], [701, "overcast"], [999, "overcast"],
  ["Rain", "rain"], ["Clear", "clear"], ["Partly cloudy", "partlyCloudy"], ["Snow", "snow"],
  ["Overcast", "overcast"], [undefined, "overcast"], ["unknown", "overcast"],
] as const)("%s maps to %s", (value, key) => { expect(conditionKey(value)).toBe(key); });
