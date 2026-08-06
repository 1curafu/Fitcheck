import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { useLocationPicker } from "../use-location-picker";
import { searchCities } from "../geocode";
import { getCurrentPosition, permissionState, GeoError } from "../geolocate";

vi.mock("../geocode", () => ({ searchCities: vi.fn() }));
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
  expect(mockSearch).toHaveBeenCalledWith("Man");
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
