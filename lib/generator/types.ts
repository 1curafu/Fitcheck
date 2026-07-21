// Shared contracts for the Stylist generator. Mirrors the v2 handoff's
// README §State Management. See docs/superpowers/plans/2026-07-18-stylist-generator.md.

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
  name: string;
  why: string;
  pieces: LookPiece[];
  anchorIndex: number;
};

export type HourCell = { hh: string; tempC: number; rain: boolean; isNow: boolean };

export type WeatherPayload = {
  tempC: number;
  feelsLikeC: number;
  condition: string;
  cityLabel: string;
  timezone: string; // IANA zone at the location, e.g. "Europe/Berlin" — from timezone=auto
  laterSentence: string; // full: "Rain from 21:00 — take a shell."
  adviceClause: string; // JUST the rust clause: "take a shell." — the UI binds the rust <b> to THIS
  laterLabel: string; // "LATER" (static caps label)
  hourly: HourCell[]; // 4 cells for the expand strip
};
// Invariant (assert in the generate action + advice tests): laterSentence.includes(adviceClause).

export type GenerateResult =
  | { status: "ok"; weather: WeatherPayload; looks: Look[] }
  | { status: "empty"; weather: WeatherPayload }
  | { status: "error"; message: string };
