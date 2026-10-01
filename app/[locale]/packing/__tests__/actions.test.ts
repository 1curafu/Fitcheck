import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ narrate: vi.fn(), save: vi.fn(), solve: vi.fn(), entitlements: vi.fn(), locale: vi.fn(),
  closet: [] as unknown[], profile: {} as Record<string, unknown> }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) },
  from: () => { const q = { select: () => q, eq: () => q,
    maybeSingle: async () => ({ data: mock.profile, error: null }),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: mock.closet, error: null }).then(resolve) }; return q; },
}) }));
vi.mock("@/lib/i18n/action-locale", () => ({ getActionLocale: mock.locale }));
vi.mock("@/lib/i18n/revalidate", () => ({ revalidateEverywhere: vi.fn() }));
vi.mock("@/lib/billing/entitlements", () => ({ currentEntitlements: mock.entitlements, recordGeneration: vi.fn() }));
vi.mock("@/lib/weather/forecast", () => ({ fetchTripForecast: async () => ({ byDate: {}, beyondHorizon: false }) }));
vi.mock("@/lib/packing/capsule", () => ({ QUALITY_FLOOR: 0, solveCapsule: mock.solve }));
vi.mock("@/lib/packing/schedule", () => ({ scheduleDays: () => [{ day: { date: "2026-09-28", occasion: "everyday" }, itemIds: [], wearIndex: {} }] }));
vi.mock("@/lib/packing/plan", () => ({ expandDays: () => [{ date: "2026-09-28", occasion: "everyday" }], realBuilder: vi.fn() }));
vi.mock("@/lib/packing/narrate", () => ({ narrateTrip: mock.narrate }));
vi.mock("@/lib/packing/store", () => ({
  saveTrip: async () => "trip", saveTripLooks: mock.save, replaceCapsule: vi.fn(),
  loadTrip: async () => ({ destinationLabel: "Zurich", lat: 47.37, lon: 8.54, timezone: "Europe/Zurich",
    startDate: "2026-09-28", endDate: "2026-09-28", occasionMix: { everyday: 1 }, rewearLevel: 2, capsule: [] }),
}));
import { realBuilder } from "@/lib/packing/plan";
import { planTrip, editCapsule } from "../actions";
const input = { destinationLabel: "Zurich", lat: 47.37, lon: 8.54, timezone: "Europe/Zurich",
  startDate: "2026-09-28", endDate: "2026-09-28", occasionMix: { everyday: 1 }, rewearLevel: 2 };
beforeEach(() => {
  vi.clearAllMocks(); mock.closet = []; mock.profile = {}; mock.locale.mockResolvedValue("uk");
  mock.entitlements.mockResolvedValue({ packingMode: true });
  mock.solve.mockReturnValue({ itemIds: [] });
  mock.narrate.mockResolvedValue({ capsule_why: "Капсула", days: [{ name: "День 1", why: "Образ" }] });
});
it.each(["create", "edit"])("%s passes the server locale to narration and original provenance", async flow => {
  if (flow === "create") await planTrip({ ...input, locale: "en-US" } as never);
  else await editCapsule("trip", {});
  expect(mock.narrate).toHaveBeenCalledWith(expect.objectContaining({ locale: "uk" }));
  expect(mock.save).toHaveBeenCalledWith("owner", "trip", expect.any(Array), [{ name: "День 1", why: "Образ" }], "uk");
  expect(mock.solve.mock.calls[0][0]).not.toHaveProperty("locale");
});
it("the paid tier gate runs before locale or narration work", async () => {
  mock.entitlements.mockResolvedValue({ packingMode: false });
  await expect(planTrip(input)).rejects.toThrow();
  expect(mock.locale).not.toHaveBeenCalled();
  expect(mock.narrate).not.toHaveBeenCalled();
});
it("a piece the user ruled out is never offered to the capsule solve", async () => {
  const row = (id: string, category: string, extra: Record<string, unknown> = {}) =>
    ({ id, category, colors: [], formality: 3, seasons: [], material: "Cotton", texture: null, pattern: "solid", ...extra });
  mock.closet = [row("tee", "Tops"), row("ripped", "Bottoms", { distressing: "Ripped" }), row("chino", "Bottoms")];
  mock.profile = { nogos: ["ripped"] };
  await planTrip(input);
  expect(mock.solve.mock.calls[0][0].closet.map((c: { id: string }) => c.id)).toEqual(["tee", "chino"]);
});
it("a piece the user pinned in the trip editor stays even when a no-go would remove it", async () => {
  const row = (id: string, category: string, extra: Record<string, unknown> = {}) =>
    ({ id, category, colors: [], formality: 3, seasons: [], material: "Cotton", texture: null, pattern: "solid", ...extra });
  mock.closet = [row("tee", "Tops"), row("ripped", "Bottoms", { distressing: "Ripped" }), row("chino", "Bottoms")];
  mock.profile = { nogos: ["ripped"] };
  await editCapsule("trip", { pin: "ripped" });
  expect(mock.solve.mock.calls[0][0].closet.map((c: { id: string }) => c.id)).toEqual(["tee", "ripped", "chino"]);
});

it("a trip is styled with the user's palette and fit answers", async () => {
  mock.profile = { palette: "Mono", fit: "Relaxed" };
  await planTrip(input);
  expect(vi.mocked(realBuilder).mock.calls[0][2]).toEqual(expect.objectContaining({ palette: "Mono", fitPref: "Relaxed" }));
});
