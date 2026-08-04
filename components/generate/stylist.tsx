"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StylistView, type StylistStatus } from "./stylist-view";
import {
  generate,
  saveLocation,
  predictDefaultOccasion,
  logOccasionOverride,
} from "@/app/generate/actions";
import { defaultReason } from "@/lib/outfits/predict-occasion";
import { searchCities, type City } from "@/lib/weather/geocode";
import { getCurrentPosition, permissionState, GeoError } from "@/lib/weather/geolocate";
import type { LocationSource } from "@/lib/weather/location";
import type { GenerateResult, Look, UiOccasion, WeatherPayload } from "@/lib/generator/types";

type Chosen = { lat: number; lon: number; label: string; source: LocationSource };

const DENIED_COPY = "Location access is off — search for a city instead.";
const FAILED_COPY = "Couldn't get your location — search for a city instead.";

const OCCASIONS: UiOccasion[] = ["everyday", "work", "weekend", "evening"];

export function Stylist() {

  /**
   * Which occasion and which of the day's looks you were on lives in the URL,
   * not in React state alone.
   *
   * This component unmounts the moment you open a look's detail screen, so
   * anything held only in state is gone when you come back: picking look 02 and
   * tapping "See the full look" used to return you to 01, and a manual switch to
   * Weekend fell back to the predicted occasion.
   *
   * Writes go through `history.replaceState`, NOT `router.replace` — the latter
   * refetches the route on every tab tap. Next supports this exact pattern for
   * search params that should not re-render the server component.
   *
   * Reads come from `window.location.search`, NOT `useSearchParams()`: that hook
   * reads the App Router's own idea of the URL and never observes a
   * `history.replaceState`, so on the way back it still reported the params from
   * before the write and the restore silently did nothing. The read happens in
   * an effect rather than a state initialiser so server and client agree on the
   * first render.
   */
  // Which look every incoming result should land on; null means 01.
  //
  // NOT consumed on first use. `generate` runs more than once per visit — the
  // silent geolocation refresh sets `city`, which re-runs it — and a
  // consume-once ref meant the second result quietly reset the selection to 01.
  // Cleared only when the day's set actually changes underneath: a regenerate or
  // an occasion switch.
  const desiredLookRef = useRef<number | null>(null);
  const urlOccasionRef = useRef<UiOccasion | null>(null);

  const writeParams = useCallback((patch: Record<string, string | null>) => {
    const next = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, []);

  const [status, setStatus] = useState<StylistStatus>("loading");
  const [occasion, setOccasion] = useState<UiOccasion>("everyday");
  const [formality, setFormality] = useState<number | null>(null);
  const [lean, setLean] = useState<string[]>([]);
  const [city, setCity] = useState<Chosen | null>(null);
  const [nonce, setNonce] = useState(0);
  const [reason, setReason] = useState<string>("");
  const [seeded, setSeeded] = useState(false);
  const predictedRef = useRef<UiOccasion>("everyday");

  const [weather, setWeather] = useState<WeatherPayload | null>(null);
  const [looks, setLooks] = useState<Look[]>([]);
  const [selectedLook, setSelectedLook] = useState(0);
  const [cities, setCities] = useState<City[]>([]);
  const [refineOpen, setRefineOpen] = useState(false);
  const [missing, setMissing] = useState<string | null>(null);
  // The seam's own words for which allowance ran out — never re-worded here.
  const [limitMessage, setLimitMessage] = useState<string>("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
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
  //      choice, so GPS must not silently replace it.
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

  const applyResult = useCallback(
    (res: GenerateResult) => {
      // The first result tells us the STORED provenance. A saved city blocks the
      // silent refresh for good; anything else releases the parked GPS fix.
      if (geoAllowedRef.current === null && res.status !== "error") {
        geoAllowedRef.current = res.weather.locationOrigin !== "city";
        applyPendingGeo();
      }

      if (res.status === "ok") {
        setWeather(res.weather);
        setLooks(res.looks);
        // Hold the look the user was on — clamped, because a regenerate may
        // have returned fewer than the index refers to.
        setSelectedLook(Math.min(desiredLookRef.current ?? 0, Math.max(res.looks.length - 1, 0)));
        setStatus("ok");
      } else if (res.status === "empty") {
        setWeather(res.weather);
        setLooks([]);
        setMissing(res.missing);
        setStatus("empty");
      } else if (res.status === "limited") {
        // Weather is kept so the strip stays put — being out of regenerates
        // does not mean the app stopped knowing the forecast. Looks are NOT
        // cleared for the same reason a limit is not an error: whatever the
        // user was already looking at is still theirs to look at.
        setWeather(res.weather);
        setLimitMessage(res.message);
        setStatus("limited");
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
    },
    [city, applyPendingGeo],
  );

  // Reads today's stored set. Switching occasion runs this again,
  // but the action answers from the database — no AI call, no spend.
  // The morning seed: predict the occasion BEFORE the first generate, so the
  // generate effect reads the right stored set and runs ONCE. Predicting is
  // cheap (no AI/weather). The generate effect is gated on `seeded` below, so
  // it never fires for the placeholder "everyday" and then again for the
  // prediction — that would spend two AI calls on a fresh day.
  useEffect(() => {
    let cancelled = false;

    // Synchronous, before the async prediction resolves — so the generate effect
    // (gated on `seeded`) runs once, against the restored occasion.
    const sp = new URLSearchParams(window.location.search);
    const restoredOccasion = OCCASIONS.find((o) => o === sp.get("occasion")) ?? null;
    urlOccasionRef.current = restoredOccasion;
    desiredLookRef.current = Number(sp.get("look")) || null;
    if (restoredOccasion) setOccasion(restoredOccasion);

    predictDefaultOccasion()
      .then(({ occasion: predicted, reason: why }) => {
        if (cancelled) return;
        // predictedRef is set either way — it is the baseline every override is
        // logged against, and a restored URL occasion is not a fresh override
        // (the user already tapped it once, and it was logged then).
        predictedRef.current = predicted;
        if (urlOccasionRef.current) setReason(defaultReason(urlOccasionRef.current));
        else {
          setReason(why);
          setOccasion(predicted);
        }
      })
      .finally(() => {
        // Release the gate even if prediction fails — looks still load against
        // the "everyday" fallback.
        if (!cancelled) setSeeded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!seeded) return; // wait for the prediction, so generate runs once
    let cancelled = false;
    setStatus("loading");
    generate({ occasion, formality, lean, city: city ?? undefined }).then((res) => {
      if (cancelled) return;
      applyResult(res);
    });
    return () => {
      cancelled = true;
    };
  }, [seeded, occasion, formality, lean, city, nonce, applyResult]);

  /**
   * The only path that spends an AI call on a day already answered.
   *
   * Deliberately a direct call rather than an effect dependency: a flag routed
   * through the effect can still be in flight when the user switches occasion,
   * and would then regenerate that occasion too.
   */
  const regenerate = useCallback(() => {
    // A fresh set starts at 01, and the remembered index may not even exist.
    desiredLookRef.current = null;
    writeParams({ look: null });
    setStatus("loading");
    generate({ occasion, formality, lean, city: city ?? undefined, regenerate: true }).then(
      applyResult,
    );
  }, [occasion, formality, lean, city, applyResult, writeParams]);

  return (
    <StylistView
      status={status}
      weather={weather}
      looks={looks}
      selectedLook={selectedLook}
      occasion={occasion}
      cities={cities}
      refineOpen={refineOpen}
      missing={missing}
      limitMessage={limitMessage}
      upgradeOpen={upgradeOpen}
      onShowUpgrade={() => setUpgradeOpen(true)}
      onCloseUpgrade={() => setUpgradeOpen(false)}
      locating={locating}
      geoError={geoError}
      reason={reason}
      onOccasion={(o) => {
        setOccasion(o);
        setReason(defaultReason(o));
        // A new occasion is a new set of looks — drop the remembered index.
        desiredLookRef.current = null;
        writeParams({ occasion: o, look: null });
        // A tap that departs from the prediction is the flywheel signal for the
        // future learner. Fire-and-forget — it must never disturb the looks.
        if (o !== predictedRef.current) {
          logOccasionOverride({ predicted: predictedRef.current, chosen: o }).catch(() => {});
        }
      }}
      onOpenRefine={() => setRefineOpen(true)}
      onCloseRefine={() => setRefineOpen(false)}
      onRefineApply={({ formality: f, lean: c }) => {
        setFormality(f);
        setLean(c);
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
      onSelectLook={(i) => {
        desiredLookRef.current = i || null;
        setSelectedLook(i);
        writeParams({ look: i === 0 ? null : String(i) });
      }}
      onRetry={() => setNonce((n) => n + 1)}
      onRegenerate={regenerate}
    />
  );
}
