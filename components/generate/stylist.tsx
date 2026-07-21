"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StylistView, type StylistStatus } from "./stylist-view";
import { generate, saveLocation } from "@/app/generate/actions";
import { searchCities, type City } from "@/lib/weather/geocode";
import { getCurrentPosition, permissionState, GeoError } from "@/lib/weather/geolocate";
import type { LocationSource } from "@/lib/weather/location";
import type { Look, UiOccasion, WeatherPayload } from "@/lib/generator/types";

type Chosen = { lat: number; lon: number; label: string; source: LocationSource };

const DENIED_COPY = "Location access is off — search for a city instead.";
const FAILED_COPY = "Couldn't get your location — search for a city instead.";

export function Stylist() {
  const router = useRouter();
  const [status, setStatus] = useState<StylistStatus>("loading");
  const [occasion, setOccasion] = useState<UiOccasion>("everyday");
  const [formality, setFormality] = useState<number | null>(null);
  const [mustColors, setMustColors] = useState<string[]>([]);
  const [city, setCity] = useState<Chosen | null>(null);
  const [nonce, setNonce] = useState(0);

  const [weather, setWeather] = useState<WeatherPayload | null>(null);
  const [looks, setLooks] = useState<Look[]>([]);
  const [selectedLook, setSelectedLook] = useState(0);
  const [cities, setCities] = useState<City[]>([]);
  const [refineOpen, setRefineOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  // Optimistic: the row shows until we learn the browser has no geolocation at
  // all, at which point it disappears and city search is the only path.
  const [geoSupported, setGeoSupported] = useState(true);

  // The silent refresh must never overwrite a location the user meant to keep.
  // Two ways that can happen, both guarded here:
  //   1. a RACE — the async permission→position chain resolving after the user
  //      has already picked a city in this session;
  //   2. a SAVED CITY — profiles.location_source === 'city' is a deliberate
  //      choice (decision L2), so GPS must not silently replace it.
  // The fix is parked in a ref until both gates are known, so geolocation still
  // starts immediately rather than waiting on the first generate to return.
  const userChoseRef = useRef(false);
  const pendingGeoRef = useRef<Chosen | null>(null);
  const geoAllowedRef = useRef<boolean | null>(null); // null = stored origin unknown yet

  const applyPendingGeo = useCallback(() => {
    if (userChoseRef.current) return; // gate 1
    if (geoAllowedRef.current !== true) return; // gate 2
    const fix = pendingGeoRef.current;
    if (!fix) return;
    pendingGeoRef.current = null;
    setCity(fix);
  }, []);

  useEffect(() => {
    let cancelled = false;
    permissionState().then((state) => {
      if (cancelled) return;
      if (state === "unsupported") {
        setGeoSupported(false);
        return;
      }
      if (state !== "granted") return; // querying never prompts; reading would
      getCurrentPosition()
        .then((c) => {
          if (cancelled) return;
          pendingGeoRef.current = { ...c, label: "Current location", source: "geo" };
          applyPendingGeo();
        })
        .catch(() => {
          /* silent path — never surface an error the user didn't ask for */
        });
    });
    return () => {
      cancelled = true;
    };
  }, [applyPendingGeo]);

  // An explicit tap always wins, including over a saved city.
  const useMyLocation = useCallback(() => {
    userChoseRef.current = true;
    pendingGeoRef.current = null;
    setLocating(true);
    setGeoError(null);
    getCurrentPosition()
      .then((c) => setCity({ ...c, label: "Current location", source: "geo" }))
      .catch((e) =>
        setGeoError(e instanceof GeoError && e.kind === "denied" ? DENIED_COPY : FAILED_COPY),
      )
      .finally(() => setLocating(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    generate({ occasion, formality, mustColors, city: city ?? undefined }).then((res) => {
      if (cancelled) return;
      // The first result tells us the STORED provenance. A saved city blocks the
      // silent refresh for good; anything else releases the parked GPS fix.
      if (geoAllowedRef.current === null && res.status !== "error") {
        geoAllowedRef.current = res.weather.locationOrigin !== "city";
        applyPendingGeo();
      }

      if (res.status === "ok") {
        setWeather(res.weather);
        setLooks(res.looks);
        setSelectedLook(0);
        setStatus("ok");
      } else if (res.status === "empty") {
        setWeather(res.weather);
        setLooks([]);
        setStatus("empty");
      } else {
        setStatus("error");
      }

      // Persist only a location the user actually supplied — including the
      // silent refresh, which is the point of keeping the record fresh. Never
      // for the profile/default fallback: there is nothing new to write.
      if (city && res.status !== "error") {
        saveLocation({ ...city, timezone: res.weather.timezone }).catch(() => {
          /* non-fatal — never disturb the looks */
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [occasion, formality, mustColors, city, nonce]);

  return (
    <StylistView
      status={status}
      weather={weather}
      looks={looks}
      selectedLook={selectedLook}
      occasion={occasion}
      cities={cities}
      refineOpen={refineOpen}
      locating={locating}
      geoError={geoError}
      onOccasion={setOccasion}
      onOpenRefine={() => setRefineOpen(true)}
      onCloseRefine={() => setRefineOpen(false)}
      onRefineApply={({ formality: f, mustColors: c }) => {
        setFormality(f);
        setMustColors(c);
        setRefineOpen(false);
      }}
      onCityChange={(c) => {
        userChoseRef.current = true;
        pendingGeoRef.current = null;
        setCity({ lat: c.lat, lon: c.lon, label: c.name, source: "city" });
      }}
      onCitySearch={(q) => {
        if (q.trim().length < 2) return;
        searchCities(q).then(setCities);
      }}
      onUseMyLocation={geoSupported ? useMyLocation : undefined}
      onSelectLook={setSelectedLook}
      onRetry={() => setNonce((n) => n + 1)}
      onOpenItem={(id) => router.push(`/closet/${id}`)}
    />
  );
}
