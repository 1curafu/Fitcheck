import { z } from "zod";

// Location resolution — pure. No I/O, no clock.
// We NEVER derive a city name from coordinates: Open-Meteo has no reverse endpoint
// (D8), and third-party reverse geocoders would ship precise user coords off-stack.

/** What we persist to profiles.location_source. */
export type LocationSource = "geo" | "city";
/** Where the location we're using actually came from. */
export type LocationOrigin = LocationSource | "profile" | "default";

export type ResolvedLocation = {
  lat: number;
  lon: number;
  label: string;
  origin: LocationOrigin;
};

export type ProfileLocation = {
  location_lat: number | null;
  location_lon: number | null;
  location_label: string | null;
  /** 'city' means the user deliberately picked it — GPS must not silently override it. */
  location_source?: string | null;
};

export const DEFAULT_LOCATION: ResolvedLocation = {
  lat: 52.52,
  lon: 13.41,
  label: "Berlin",
  origin: "default",
};

/**
 * 2dp ≈ 1.1km. Raw GPS precision would make every user's forecast URL unique,
 * defeating the 30-minute fetch cache in fetchForecast and burning the
 * Open-Meteo daily request budget. Also stores less precise personal data.
 */
export function roundCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

export function resolveLocation(args: {
  input?: { lat: number; lon: number; label: string; source: LocationSource };
  profile?: ProfileLocation | null;
}): ResolvedLocation {
  const { input, profile } = args;

  if (input) {
    return { lat: input.lat, lon: input.lon, label: input.label, origin: input.source };
  }

  if (profile?.location_lat != null && profile.location_lon != null) {
    // Surface the STORED provenance, not a flat "profile": the client uses
    // origin === "city" to know a deliberate choice is in play and suppress the
    // silent GPS refresh that would otherwise overwrite it.
    const stored = profile.location_source;
    return {
      lat: profile.location_lat,
      lon: profile.location_lon,
      label: profile.location_label ?? "Current location",
      origin: stored === "city" || stored === "geo" ? stored : "profile",
    };
  }

  return { ...DEFAULT_LOCATION };
}

/**
 * The columns a location write sets, shared by both write paths.
 *
 * `saveLocation` (the Stylist, which already knows the timezone from the
 * generate that just ran) and `setLocation` (Settings, which has to resolve one)
 * must write identical shapes — a column set that drifts between them is how the
 * two screens start disagreeing about where you are.
 *
 * Pure, and takes `nowIso` rather than reading the clock, so it can be tested.
 */
export function locationColumns(d: LocationInput, nowIso: string) {
  return {
    location_lat: roundCoord(d.lat),
    location_lon: roundCoord(d.lon),
    location_label: d.label,
    location_source: d.source,
    location_timezone: d.timezone,
    location_updated_at: nowIso,
  };
}

/** Great-circle distance in kilometres. */
export function distanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * How far the user must move before today's looks are wrong.
 *
 * This is a WEATHER threshold, not a precision one. Below ~25km the forecast is
 * effectively identical, so the stored looks are still right for the conditions
 * they were composed for, and throwing them away would spend a model call to
 * produce the same answer.
 *
 * It has to be this coarse because the Stylist's silent GPS refresh runs on
 * every load: at a tighter threshold, anyone who commutes would pay for a fresh
 * generation every morning.
 */
export const STALE_LOCATION_KM = 25;

/**
 * Has the user moved far enough that today's stored drop no longer describes
 * where they are?
 *
 * `previous` is the RESOLVED location the looks were built for — pass
 * `resolveLocation({ profile })`, not the raw columns. A profile with no
 * location still generated its drop against `DEFAULT_LOCATION`, so comparing
 * against a null column would miss the very first move a user makes.
 */
export function locationMoved(
  next: { lat: number; lon: number },
  previous: { lat: number; lon: number },
  minKm: number = STALE_LOCATION_KM,
): boolean {
  return distanceKm(next, previous) > minKm;
}

/**
 * Should today's stored drop be thrown away and rebuilt?
 *
 * INTENT decides this, not distance. Distance is only a proxy for intent, and
 * the wrong one: a user who deliberately picks a city 10km away has asked for
 * looks there, and if nothing changes the app reads as broken with no way to
 * tell why. The threshold exists for the case where nobody asked — the
 * Stylist's silent GPS refresh, which runs on every load and would otherwise
 * charge a commuter a fresh generation every morning.
 *
 * - Same place → never. A no-op tap must not cost a rebuild.
 * - Deliberate pick (`city`) → always, however near.
 * - GPS (`geo`) → only past `STALE_LOCATION_KM`, where the forecast can differ.
 *
 * An explicit "Use my location" tap arrives as `geo` and cannot be told apart
 * from the silent refresh. That is fine: if the user has not moved, there is
 * nothing to rebuild.
 *
 * `previous` is the RESOLVED location the looks were built for — pass
 * `resolveLocation({ profile })`, so the first move away from DEFAULT_LOCATION
 * counts even with nothing stored yet.
 */
export function invalidatesDrop(
  next: { lat: number; lon: number; source: LocationSource },
  previous: { lat: number; lon: number },
): boolean {
  const samePlace =
    roundCoord(next.lat) === roundCoord(previous.lat) &&
    roundCoord(next.lon) === roundCoord(previous.lon);
  if (samePlace) return false;

  return next.source === "city" ? true : locationMoved(next, previous);
}

/**
 * What the client may persist. Plain Zod validation keywords are fine here —
 * this schema is NEVER sent to Anthropic as a structured-output format, so the
 * `forStructuredOutput()` stripping rule does not apply.
 */
export const LocationInputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  label: z.string().min(1).max(80),
  source: z.enum(["geo", "city"]),
  timezone: z.string().min(1).max(64),
});

export type LocationInput = z.infer<typeof LocationInputSchema>;
