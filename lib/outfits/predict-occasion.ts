import type { UiOccasion } from "@/lib/generator/types";

/**
 * The predicted occasion for the user's morning.
 *
 * A prediction of their day, not a fixed rule — the seam for the future learner
 * is the (later, optional) `history` argument this signature can grow. For now:
 * the day-of-week, narrowed to occasions they actually dress for.
 *
 * Priority differs by day-type, and always falls back through the occasions the
 * user DID pick, so it never surfaces one they skipped. Empty picks → everyday,
 * matching the previous hardcoded default so nothing regresses.
 */
export function predictOccasion(now: Date, timeZone: string, occasions: string[]): UiOccasion {
  const weekend = isWeekend(now, timeZone);
  const priority: UiOccasion[] = weekend
    ? ["weekend", "everyday", "work", "evening"]
    : ["work", "everyday", "weekend", "evening"];

  const dressesFor = new Set(occasions.map((o) => o.toLowerCase()));
  return priority.find((o) => dressesFor.has(o)) ?? "everyday";
}

/** Day-of-week in the user's zone. `Intl` `weekday: "short"` is locale-stable in en-US. */
function isWeekend(now: Date, timeZone: string): boolean {
  let day: string;
  try {
    day = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(now);
  } catch {
    day = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" }).format(now);
  }
  return day === "Sat" || day === "Sun";
}

const REASONS: Record<UiOccasion, string> = {
  work: "Styled for your work day",
  everyday: "Everyday ease",
  weekend: "Weekend, off-duty",
  evening: "Out tonight",
};

/** The legible "why" shown above the looks — makes the smart default feel intentional. */
export function defaultReason(occasion: UiOccasion): string {
  return REASONS[occasion];
}
