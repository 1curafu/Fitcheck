"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StylistView, type StylistStatus } from "./stylist-view";
import { generate } from "@/app/generate/actions";
import { searchCities, type City } from "@/lib/weather/geocode";
import type { Look, UiOccasion, WeatherPayload } from "@/lib/generator/types";

type Chosen = { lat: number; lon: number; label: string };

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

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    generate({ occasion, formality, mustColors, city: city ?? undefined }).then((res) => {
      if (cancelled) return;
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
      onOccasion={setOccasion}
      onOpenRefine={() => setRefineOpen(true)}
      onCloseRefine={() => setRefineOpen(false)}
      onRefineApply={({ formality: f, mustColors: c }) => {
        setFormality(f);
        setMustColors(c);
        setRefineOpen(false);
      }}
      onCityChange={(c) => setCity({ lat: c.lat, lon: c.lon, label: c.name })}
      onCitySearch={(q) => {
        if (q.trim().length < 2) return;
        searchCities(q).then(setCities);
      }}
      onSelectLook={setSelectedLook}
      onRetry={() => setNonce((n) => n + 1)}
      onOpenItem={(id) => router.push(`/closet/${id}`)}
    />
  );
}
