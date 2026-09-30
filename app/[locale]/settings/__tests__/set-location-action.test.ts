import { beforeEach, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ read: vi.fn(), update: vi.fn(), write: vi.fn(), getUser: vi.fn(), revalidate: vi.fn(), clear: vi.fn() }));
vi.mock("@/lib/account-deletion/runtime", () => ({ deleteLiveAccount: vi.fn() }));
vi.mock("@/lib/share/store", () => ({ stop: vi.fn() }));
vi.mock("@/lib/i18n/revalidate", () => ({ revalidateEverywhere: mock.revalidate }));
vi.mock("@/lib/outfits/clear-today", () => ({ clearTodaysDrop: mock.clear }));
vi.mock("@/lib/weather/forecast", () => ({ fetchForecast: async () => ({ timezone: "Europe/Zurich" }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mock.getUser },
  from: () => ({ select: () => ({ eq: () => ({ single: mock.read }) }), update: mock.update }),
}) }));
import { setLocation } from "../actions";

const zurich = { lat: 47.37, lon: 8.54, label: "Zurich" };

beforeEach(() => {
  vi.resetAllMocks();
  mock.getUser.mockResolvedValue({ data: { user: { id: "user" } } });
  mock.read.mockResolvedValue({ data: { location_lat: null, location_lon: null, location_label: null, location_source: null }, error: null });
  mock.update.mockReturnValue({ eq: mock.write });
  mock.write.mockResolvedValue({ error: null });
});

it("moving to a new city clears today's looks in the NEW timezone", async () => {
  await setLocation(zurich);
  expect(mock.clear).toHaveBeenCalledWith(expect.anything(), "user", "Europe/Zurich");
});

it("a failed clear never fails the move: the location IS saved, and the looks age out at midnight or on Regenerate", async () => {
  // `clearTodaysDrop` throws on errors now (the style-profile save needs that). The settings location row has no
  // honest way to say "moved, but old looks survive", so setLocation must keep swallowing it.
  mock.clear.mockRejectedValue(new Error("clear failed"));
  await expect(setLocation(zurich)).resolves.toBeUndefined();
  expect(mock.write).toHaveBeenCalledWith("id", "user");
  expect(mock.revalidate).toHaveBeenCalledWith("/settings");
});
