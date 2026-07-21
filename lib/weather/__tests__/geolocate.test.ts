import { getCurrentPosition, permissionState, GeoError } from "../geolocate";

/** jsdom's navigator has no geolocation/permissions — define them per test. */
function stubNavigator(props: Record<string, unknown>) {
  for (const [key, value] of Object.entries(props)) {
    Object.defineProperty(navigator, key, { value, configurable: true, writable: true });
  }
}

afterEach(() => {
  stubNavigator({ geolocation: undefined, permissions: undefined });
});

test("getCurrentPosition resolves browser coords to our {lat,lon} shape", async () => {
  stubNavigator({
    geolocation: {
      getCurrentPosition: (ok: (p: unknown) => void) =>
        ok({ coords: { latitude: 52.5187234, longitude: 13.4098765 } }),
    },
  });
  await expect(getCurrentPosition()).resolves.toEqual({ lat: 52.5187234, lon: 13.4098765 });
});

test("a denial (code 1) rejects with a typed GeoError, not a raw browser error", async () => {
  stubNavigator({
    geolocation: {
      getCurrentPosition: (_ok: unknown, fail: (e: unknown) => void) => fail({ code: 1 }),
    },
  });
  await expect(getCurrentPosition()).rejects.toBeInstanceOf(GeoError);
  await getCurrentPosition().catch((e: GeoError) => expect(e.kind).toBe("denied"));
});

test("a timeout (code 3) and an unavailable position (code 2) are distinguished", async () => {
  stubNavigator({
    geolocation: { getCurrentPosition: (_ok: unknown, fail: (e: unknown) => void) => fail({ code: 3 }) },
  });
  await getCurrentPosition().catch((e: GeoError) => expect(e.kind).toBe("timeout"));

  stubNavigator({
    geolocation: { getCurrentPosition: (_ok: unknown, fail: (e: unknown) => void) => fail({ code: 2 }) },
  });
  await getCurrentPosition().catch((e: GeoError) => expect(e.kind).toBe("unavailable"));
});

test("no geolocation API at all → unsupported, never a crash", async () => {
  stubNavigator({ geolocation: undefined });
  await getCurrentPosition().catch((e: GeoError) => expect(e.kind).toBe("unsupported"));
  await expect(permissionState()).resolves.toBe("unsupported");
});

test("permissionState reports the browser's stored answer — this drives the silent refresh", async () => {
  stubNavigator({
    geolocation: { getCurrentPosition: vi.fn() },
    permissions: { query: async () => ({ state: "granted" }) },
  });
  await expect(permissionState()).resolves.toBe("granted");
});

test("no Permissions API (older Safari) → 'prompt', so we never silently refresh there", async () => {
  stubNavigator({ geolocation: { getCurrentPosition: vi.fn() }, permissions: undefined });
  await expect(permissionState()).resolves.toBe("prompt");
});
