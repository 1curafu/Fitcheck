/**
 * City search, for the location picker on the Stylist, Settings and trip setup.
 *
 * ⚠️ **NAME-SEARCH ONLY. There is deliberately no reverse endpoint** — we never
 * derive a city name from coordinates, because that would ship precise user
 * coordinates off-stack (D8).
 *
 * ⚠️ **Moved off Open-Meteo 2026-08-28**, which was the second Open-Meteo
 * dependency in the app and kept the commercial-licence blocker open after the
 * forecast swap had apparently closed it.
 *
 * ⚠️ **The provider call is SERVER-SIDE**, behind `/api/cities`. Open-Meteo's
 * geocoding needed no key so a browser fetch was fine; OpenWeather's needs one,
 * and calling it from a client component would publish the key in the bundle.
 */

export type City = {
  name: string;
  country: string;
  lat: number;
  lon: number;
  /**
   * ⚠️ Carried because OpenWeather returns same-name duplicates freely —
   * "Springfield" comes back five times, all US. Without this the picker shows
   * five identical rows. Optional: not every place has one.
   */
  state?: string;
};

type OwmRow = {
  name?: string;
  country?: string;
  lat?: number;
  lon?: number;
  state?: string;
  /** ~40 translations per row. Deliberately dropped — nothing renders it. */
  local_names?: Record<string, string>;
};

/**
 * ⚠️ OpenWeather returns a BARE ARRAY, where Open-Meteo returned
 * `{ results: [...] }`. Reaching for `.results` here would return [] forever,
 * and an empty list is indistinguishable from "no matches" on screen.
 */
export function mapSearch(raw: unknown): City[] {
  if (!Array.isArray(raw)) return [];
  return (raw as OwmRow[])
    .filter((r) => typeof r?.lat === "number" && typeof r?.lon === "number" && r.name)
    .map((r) => {
      const city: City = {
        name: r.name!,
        country: r.country ?? "",
        lat: r.lat!,
        lon: r.lon!,
      };
      // Only set it when present, so the shape stays clean for places without one.
      if (r.state) city.state = r.state;
      return city;
    });
}

/**
 * What the weather strip shows.
 *
 * ⚠️ Stays the BARE city name. The strip truncates at `max-w-[9rem]`, so
 * "Springfield, Illinois" would be clipped mid-word on the one screen the user
 * sees every morning. Disambiguation belongs in the picker, where the choice is
 * actually made — see `regionLabel`.
 */
export function pickLabel(c: City): string {
  return c.name;
}

/**
 * The secondary line in the picker list — what tells two same-name cities apart.
 */
export function regionLabel(c: City): string {
  return c.state ? `${c.state}, ${c.country}` : c.country;
}

/**
 * ⚠️ Calls OUR endpoint, never OpenWeather directly. This function runs in the
 * browser; the API key must not.
 */
export async function searchCities(q: string, signal?: AbortSignal): Promise<City[]> {
  const res = await fetch(`/api/cities?q=${encodeURIComponent(q)}`, { signal });
  if (!res.ok) return [];
  // Already `City[]` — the route maps on the server so `local_names` never
  // crosses the wire. Guarded anyway: a proxy or error page could return HTML.
  const body: unknown = await res.json();
  return Array.isArray(body) ? (body as City[]) : [];
}
