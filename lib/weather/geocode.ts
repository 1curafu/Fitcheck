// Open-Meteo Geocoding is NAME-SEARCH ONLY (no reverse endpoint — D8).
// We never derive a city name from coordinates.

export type City = { name: string; country: string; lat: number; lon: number };

type Raw = {
  results?: { name: string; country: string; latitude: number; longitude: number }[];
};

export function mapSearch(raw: Raw): City[] {
  return (raw.results ?? []).map((r) => ({
    name: r.name,
    country: r.country,
    lat: r.latitude,
    lon: r.longitude,
  }));
}

export function pickLabel(c: City): string {
  return c.name;
}

export async function searchCities(q: string): Promise<City[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en`;
  const res = await fetch(url);
  return mapSearch(await res.json());
}
