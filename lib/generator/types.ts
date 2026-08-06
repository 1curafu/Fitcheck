// Shared contracts for the Stylist generator. Mirrors the v2 handoff's
// README §State Management. See docs/superpowers/plans/2026-07-18-stylist-generator.md.

import type { TempUnit } from "@/lib/weather/format";

export type UiOccasion = "everyday" | "work" | "weekend" | "evening";

export type Slot = {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  rotationDeg: number;
  z: number;
};

export type LookPiece = {
  itemId: string;
  category: string;
  subcategory: string | null;
  brand: string | null;
  name: string | null;
  colors: string[];
  cutoutUrl: string; // signed URL, filled at assembly time
  slot: Slot; // from layoutForLook
};

export type Look = {
  /** The `outfits` row this look was persisted as — the detail screen's address. */
  id: string;
  name: string;
  why: string;
  pieces: LookPiece[];
  anchorIndex: number;
  /** Logged as worn today. A worn look is pinned: a Regenerate leaves it alone. */
  worn: boolean;
};

/** A look before it has been persisted — it has no row id and cannot be worn yet. */
export type LookDraft = Omit<Look, "id" | "worn">;

export type HourCell ={ hh: string; tempC: number; rain: boolean; isNow: boolean };

export type WeatherPayload = {
  tempC: number;
  feelsLikeC: number;
  condition: string;
  cityLabel: string;
  timezone: string; // IANA zone at the location, e.g. "Europe/Berlin" — from timezone=auto
  // Where this location came from. "city" = a deliberate user choice; the client
  // suppresses its silent GPS refresh so a saved city is never overwritten.
  locationOrigin: "geo" | "city" | "profile" | "default";
  laterSentence: string; // full: "Rain from 21:00 — take a shell."
  adviceClause: string; // JUST the rust clause: "take a shell." — the UI binds the rust <b> to THIS
  laterLabel: string; // "LATER" (static caps label)
  hourly: HourCell[]; // 4 cells for the expand strip
  // The user's display unit. Every temperature above stays CELSIUS — it is what
  // Open-Meteo returns, what weatherRules compares against, and what the re-rank
  // prompt states to the model. `formatTemp` applies this at the render boundary
  // and nowhere earlier.
  tempUnit: TempUnit;
};
// Invariant (assert in the generate action + advice tests): laterSentence.includes(adviceClause).

export type GenerateResult =
  | { status: "ok"; weather: WeatherPayload; looks: Look[] }
  // `missing` names the required slot that blocked every combo, so the screen can
  // say WHICH gap to fill instead of a generic "add more pieces".
  | { status: "empty"; weather: WeatherPayload; missing: string | null }
  // Hitting the meter is a STATE, not a failure. It carries `weather` so the
  // screen keeps its strip, and the reason verbatim so it can say what ran out
  // and what Pro gives — never "something went wrong" for a working app.
  | { status: "limited"; weather: WeatherPayload; message: string }
  | { status: "error"; message: string };
