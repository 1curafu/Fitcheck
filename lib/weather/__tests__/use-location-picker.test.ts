import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { useLocationPicker } from "../use-location-picker";
import { searchCities, type City } from "../geocode";
import { getCurrentPosition, permissionState, GeoError } from "../geolocate";

// Stub only the network call — `regionLabel` and friends stay real.
vi.mock("../geocode", async (orig) => ({
  ...(await orig<typeof import("../geocode")>()),
  searchCities: vi.fn(),
}));
vi.mock("../geolocate", async (orig) => ({
  ...(await orig<typeof import("../geolocate")>()),
  getCurrentPosition: vi.fn(),
  permissionState: vi.fn(),
}));

const mockSearch = vi.mocked(searchCities);
const mockPosition = vi.mocked(getCurrentPosition);
const mockPermission = vi.mocked(permissionState);

beforeEach(() => {
  vi.clearAllMocks();
  mockSearch.mockResolvedValue([]);
  mockPermission.mockResolvedValue("prompt");
});

test("a query under two characters does not hit the network", () => {
  // The input fires on every keystroke; "b" would return every city on earth.
  const { result } = renderHook(() => useLocationPicker());
  act(() => result.current.search("b"));
  act(() => result.current.search(" "));
  expect(mockSearch).not.toHaveBeenCalled();
});

test("a real query searches and exposes the results", async () => {
  mockSearch.mockResolvedValue([{ name: "Manila", country: "PH", lat: 14.6, lon: 120.98 }]);
  const { result } = renderHook(() => useLocationPicker());
  act(() => result.current.search("Man"));
  await waitFor(() => expect(result.current.cities).toHaveLength(1));
  expect(mockSearch).toHaveBeenCalledWith("Man", expect.any(AbortSignal));
});

/**
 * ⚠️ City search is now proxied through our own endpoint against a metered
 * OpenWeather quota, so an abandoned keystroke must be CANCELLED, not merely
 * ignored on arrival. The old `latestQuery` guard discarded the answer but the
 * request still completed and still cost a call.
 */
test("a new keystroke aborts the request still in flight", async () => {
  const { result } = renderHook(() => useLocationPicker());
  act(() => result.current.search("Man"));
  const first = mockSearch.mock.calls[0][1] as AbortSignal;
  expect(first.aborted).toBe(false);

  act(() => result.current.search("Manc"));
  expect(first.aborted).toBe(true);
});

test("an aborted request does not blank the list mid-type", async () => {
  mockSearch.mockResolvedValue([{ name: "Manila", country: "PH", lat: 14.6, lon: 120.98 }]);
  const { result } = renderHook(() => useLocationPicker());
  act(() => result.current.search("Man"));
  await waitFor(() => expect(result.current.cities).toHaveLength(1));

  // The abort rejection must not be treated as "no matches".
  mockSearch.mockRejectedValueOnce(Object.assign(new Error("aborted"), { name: "AbortError" }));
  act(() => result.current.search("Manc"));
  await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(2));
  expect(result.current.cities).toHaveLength(1);
});

test("an explicit tap surfaces a denied permission as copy, not a silent no-op", async () => {
  mockPosition.mockRejectedValue(new GeoError("denied"));
  const { result } = renderHook(() => useLocationPicker());
  act(() => result.current.useMyLocation());
  await waitFor(() => expect(result.current.geoError).toMatch(/location access is off/i));
});

test("a non-permission failure gets different copy — the user can retry that one", async () => {
  mockPosition.mockRejectedValue(new GeoError("timeout"));
  const { result } = renderHook(() => useLocationPicker());
  act(() => result.current.useMyLocation());
  await waitFor(() => expect(result.current.geoError).toMatch(/couldn.t get your location/i));
});

test("locating returns to false after a failure, not stuck", async () => {
  // A spinner that never stops is indistinguishable from a hung app.
  mockPosition.mockRejectedValue(new GeoError("unavailable"));
  const { result } = renderHook(() => useLocationPicker());
  act(() => result.current.useMyLocation());
  await waitFor(() => expect(result.current.locating).toBe(false));
});

test("a successful fix is handed to onPick, labelled as a GPS fix", async () => {
  // We never reverse-geocode a name from coordinates: Open-Meteo has no reverse
  // endpoint (D8) and a third party would ship precise user coords off-stack.
  mockPosition.mockResolvedValue({ lat: 52.52, lon: 13.41 });
  const onPick = vi.fn();
  const { result } = renderHook(() => useLocationPicker({ onPick }));
  act(() => result.current.useMyLocation());
  await waitFor(() =>
    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({ lat: 52.52, lon: 13.41, label: "Current location" }),
    ),
  );
});

test("geoSupported goes false only when the browser has no geolocation at all", async () => {
  // Optimistic on purpose: the row shows until we KNOW it is useless. A denied
  // permission is not the same as an unsupported browser — the first is
  // recoverable in system settings, the second never is.
  mockPermission.mockResolvedValue("denied");
  const { result } = renderHook(() => useLocationPicker());
  await waitFor(() => expect(mockPermission).toHaveBeenCalled());
  expect(result.current.geoSupported).toBe(true);

  mockPermission.mockResolvedValue("unsupported");
  const second = renderHook(() => useLocationPicker());
  await waitFor(() => expect(second.result.current.geoSupported).toBe(false));
});

test("probing permission never reads the position — that would prompt", async () => {
  mockPermission.mockResolvedValue("granted");
  renderHook(() => useLocationPicker());
  await waitFor(() => expect(mockPermission).toHaveBeenCalled());
  // The silent-refresh-on-load behaviour belongs to the Stylist, not this hook.
  expect(mockPosition).not.toHaveBeenCalled();
});

test("a slow earlier query cannot overwrite a newer one", async () => {
  // Typing "Oslo" fires searches for "Os", "Osl" and "Oslo". Without this
  // guard the last response to ARRIVE wins rather than the last one asked for,
  // so the list showed matches for "Os" — Oss, Os de Balaguer — while the field
  // read "Oslo". Caught in a real browser, not by any unit test.
  let resolveSlow: (v: City[]) => void = () => {};
  mockSearch.mockImplementationOnce(
    () => new Promise<City[]>((res) => (resolveSlow = res)),
  );
  mockSearch.mockResolvedValueOnce([{ name: "Oslo", country: "NO", lat: 59.91, lon: 10.75 }]);

  const { result } = renderHook(() => useLocationPicker());
  act(() => result.current.search("Os"));
  act(() => result.current.search("Oslo"));

  await waitFor(() => expect(result.current.cities[0]?.name).toBe("Oslo"));

  // The stale response lands afterwards and must be ignored.
  await act(async () => {
    resolveSlow([{ name: "Oss", country: "NL", lat: 51.76, lon: 5.51 }]);
  });
  expect(result.current.cities[0]?.name).toBe("Oslo");
});

test("clearing the field clears the results", async () => {
  // Otherwise a long query's matches sit under an empty box, and the next
  // thing the user types looks like it returned yesterday's answer.
  mockSearch.mockResolvedValue([{ name: "Oslo", country: "NO", lat: 59.91, lon: 10.75 }]);
  const { result } = renderHook(() => useLocationPicker());
  act(() => result.current.search("Oslo"));
  await waitFor(() => expect(result.current.cities).toHaveLength(1));
  act(() => result.current.search(""));
  await waitFor(() => expect(result.current.cities).toHaveLength(0));
});
