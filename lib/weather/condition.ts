export type ConditionKey = "rain" | "clear" | "partlyCloudy" | "snow" | "overcast";

/** Display families from stable provider IDs or older English snapshots. */
export function conditionKey(value: number | string | undefined): ConditionKey {
  if (typeof value === "string") {
    const legacy: Record<string, ConditionKey> = {
      Rain: "rain", Clear: "clear", "Partly cloudy": "partlyCloudy", Snow: "snow", Overcast: "overcast",
    };
    return Object.hasOwn(legacy, value) ? legacy[value] : "overcast";
  }
  if (typeof value !== "number") return "overcast";
  const band = Math.floor(value / 100);
  if (band === 2 || band === 3 || band === 5) return "rain";
  if (band === 6) return "snow";
  if (value === 800) return "clear";
  if (value === 801 || value === 802) return "partlyCloudy";
  return "overcast";
}
