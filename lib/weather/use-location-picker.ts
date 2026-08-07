"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { searchCities, type City } from "./geocode";
import { getCurrentPosition, permissionState, GeoError } from "./geolocate";

const DENIED_COPY = "Location access is off — search for a city instead.";
const FAILED_COPY = "Couldn't get your location — search for a city instead.";

/** A place the user deliberately chose, on either screen. */
export type PickedLocation = { lat: number; lon: number; label: string; source: "geo" | "city" };

/**
 * Everything the Stylist's weather pill and the Settings location row share:
 * city search, an explicit "use my location" tap, and the three pieces of state
 * the UI needs to be honest about what is happening.
 *
 * ⚠️ It deliberately does NOT own the Stylist's silent GPS refresh on load.
 * That exists because the Stylist generates on mount and wants a fresh fix;
 * Settings has no equivalent moment and must not rewrite a location while the
 * user is looking at it. It also gates itself on `res.weather.locationOrigin`
 * from a generate result, which Settings does not have. If a later plan unifies
 * it, pass the stored origin IN as an argument (Settings can read
 * `location_source` server-side) rather than re-deriving it here.
 */
export function useLocationPicker(opts?: { onPick?: (p: PickedLocation) => void }) {
  const onPick = opts?.onPick;

  const [cities, setCities] = useState<City[]>([]);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  // Optimistic: the row shows until we learn the browser has no geolocation at
  // all, at which point it disappears and city search is the only path. A
  // DENIED permission is not the same thing — that is recoverable in system
  // settings, so the control stays and explains itself on tap.
  const [geoSupported, setGeoSupported] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Querying permission never prompts; reading the position would. So this
    // only ever learns whether the API exists.
    permissionState().then((state) => {
      if (!cancelled && state === "unsupported") setGeoSupported(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * The query whose response we are still willing to accept.
   *
   * Typing "Oslo" fires searches for "Os", "Osl" and "Oslo". Without this the
   * last response to ARRIVE wins rather than the last one asked for, and the
   * list showed matches for "Os" — Oss, Os de Balaguer — under a field reading
   * "Oslo". A ref, not state: it must be readable by a closure created before
   * the next render.
   */
  const latestQuery = useRef("");

  const search = useCallback((q: string) => {
    const query = q.trim();
    latestQuery.current = query;

    // The input fires on every keystroke, and a single letter matches most of
    // the planet. Two characters is the floor that makes the result list mean
    // anything. Below it, clear — stale matches sitting under an emptied box
    // read as a fresh answer to whatever the user types next.
    if (query.length < 2) {
      setCities([]);
      return;
    }

    searchCities(query)
      .then((r) => {
        if (latestQuery.current === query) setCities(r);
      })
      .catch(() => {
        if (latestQuery.current === query) setCities([]);
      });
  }, []);

  const useMyLocation = useCallback(() => {
    setLocating(true);
    setGeoError(null);
    getCurrentPosition()
      .then((c) =>
        // Never reverse-geocoded: Open-Meteo has no reverse endpoint (D8) and a
        // third-party one would ship precise user coordinates off-stack.
        onPick?.({ ...c, label: "Current location", source: "geo" }),
      )
      .catch((e) =>
        setGeoError(e instanceof GeoError && e.kind === "denied" ? DENIED_COPY : FAILED_COPY),
      )
      .finally(() => setLocating(false));
  }, [onPick]);

  return { cities, search, useMyLocation, locating, geoError, geoSupported };
}
