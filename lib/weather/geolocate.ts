// A thin, mockable wrapper around navigator.geolocation / navigator.permissions.
// Keeping the browser API behind this boundary is what lets stylist.tsx stay
// declarative and lets the tests run in jsdom, which has neither API.

export type GeoErrorKind = "denied" | "unavailable" | "timeout" | "unsupported";

export class GeoError extends Error {
  readonly kind: GeoErrorKind;
  constructor(kind: GeoErrorKind) {
    super(`geolocation: ${kind}`);
    this.name = "GeoError";
    this.kind = kind;
  }
}

/** PositionError codes: 1 PERMISSION_DENIED · 2 POSITION_UNAVAILABLE · 3 TIMEOUT */
function kindFor(code: number): GeoErrorKind {
  if (code === 1) return "denied";
  if (code === 3) return "timeout";
  return "unavailable";
}

export function getCurrentPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new GeoError("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => reject(new GeoError(kindFor(e.code))),
      { timeout: 10_000, maximumAge: 300_000 },
    );
  });
}

/**
 * "granted" is the only state that authorises a SILENT read on load — querying
 * permissions never shows a prompt, but getCurrentPosition would.
 */
export async function permissionState(): Promise<"granted" | "prompt" | "denied" | "unsupported"> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return "unsupported";
  if (!navigator.permissions?.query) return "prompt"; // older Safari — tap path only
  try {
    const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    return status.state;
  } catch {
    return "prompt";
  }
}
