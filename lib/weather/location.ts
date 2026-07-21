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
    return {
      lat: profile.location_lat,
      lon: profile.location_lon,
      label: profile.location_label ?? "Current location",
      origin: "profile",
    };
  }

  return { ...DEFAULT_LOCATION };
}
