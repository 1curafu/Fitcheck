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
