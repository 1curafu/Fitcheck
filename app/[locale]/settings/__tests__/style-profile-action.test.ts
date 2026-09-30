import { beforeEach, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ read: vi.fn(), update: vi.fn(), write: vi.fn(), getUser: vi.fn(), revalidate: vi.fn(), clear: vi.fn() }));
vi.mock("@/lib/account-deletion/runtime", () => ({ deleteLiveAccount: vi.fn() }));
vi.mock("@/lib/share/store", () => ({ stop: vi.fn() }));
vi.mock("@/lib/i18n/revalidate", () => ({ revalidateEverywhere: mock.revalidate }));
vi.mock("@/lib/outfits/clear-today", () => ({ clearTodaysDrop: mock.clear }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mock.getUser },
  from: () => ({ select: () => ({ eq: () => ({ single: mock.read }) }), update: mock.update }),
}) }));
import { updateStyleProfile } from "../actions";

const answers = {
  archetype: "Old Money", palette: "Neutrals", fit: "Tailored",
  dress_codes: ["Smart casual"], occasions: ["Work"], nogos: ["ripped"],
};
const stored = { archetype: "Old Money", nogos: ["ripped"], formality_min: 3, formality_max: 3, location_timezone: "Europe/Zurich" };

beforeEach(() => {
  vi.resetAllMocks();
  mock.getUser.mockResolvedValue({ data: { user: { id: "user" } } });
  mock.read.mockResolvedValue({ data: stored, error: null });
  mock.update.mockReturnValue({ eq: mock.write });
  mock.write.mockResolvedValue({ error: null });
});

it("saves the six answers with the derived band, and never touches onboarding state", async () => {
  await updateStyleProfile(answers);
  expect(mock.update).toHaveBeenCalledWith({ ...answers, formality_min: 3, formality_max: 3 });
  expect(mock.write).toHaveBeenCalledWith("id", "user");
  expect(mock.update.mock.calls[0][0]).not.toHaveProperty("onboarded_at");
});

it("an unchanged look input keeps today's looks", async () => {
  await updateStyleProfile({ ...answers, palette: "Earth", occasions: ["Weekend"] });
  expect(mock.clear).not.toHaveBeenCalled();
});

it("a new no-go clears today's looks in the profile's timezone", async () => {
  await updateStyleProfile({ ...answers, nogos: ["ripped", "shorts"] });
  expect(mock.clear).toHaveBeenCalledWith(expect.anything(), "user", "Europe/Zurich");
});

it("a profile without a timezone clears BOTH days it may be stored under", async () => {
  // Styled looks key on the profile timezone, else UTC; the daily drop keys on the forecast timezone, which for
  // a profile with no saved location is the default city's (Berlin). Clearing only UTC left a 00:00-02:00 hole.
  mock.read.mockResolvedValue({ data: { ...stored, location_timezone: null }, error: null });
  await updateStyleProfile({ ...answers, dress_codes: ["Business"] });
  expect(mock.clear).toHaveBeenCalledWith(expect.anything(), "user", "UTC");
  expect(mock.clear).toHaveBeenCalledWith(expect.anything(), "user", "Europe/Berlin");
  expect(mock.clear).toHaveBeenCalledTimes(2);
});

it("a failed clear puts the previous answers back and reports the failure, so a retry still rebuilds", async () => {
  mock.read.mockResolvedValue({ data: { ...stored, palette: "Earth", fit: "Relaxed", dress_codes: ["Smart casual"], occasions: ["Weekend"] }, error: null });
  mock.clear.mockRejectedValue(new Error("clear failed"));
  await expect(updateStyleProfile({ ...answers, nogos: ["ripped", "shorts"] })).rejects.toThrow("clear failed");
  expect(mock.update).toHaveBeenCalledTimes(2);
  expect(mock.update.mock.calls[1][0]).toEqual({
    archetype: "Old Money", palette: "Earth", fit: "Relaxed", dress_codes: ["Smart casual"], occasions: ["Weekend"],
    nogos: ["ripped"], formality_min: 3, formality_max: 3,
  });
});

it("a legacy stored no-go is not a change on its own", async () => {
  mock.read.mockResolvedValue({ data: { ...stored, nogos: ["ripped", "bright"] }, error: null });
  await updateStyleProfile(answers);
  expect(mock.clear).not.toHaveBeenCalled();
  expect(mock.update.mock.calls[0][0].nogos).toEqual(["ripped"]);
});

it("refuses a signed-out caller before reading anything", async () => {
  mock.getUser.mockResolvedValue({ data: { user: null } });
  await expect(updateStyleProfile(answers)).rejects.toThrow("Not signed in");
  expect(mock.read).not.toHaveBeenCalled();
  expect(mock.update).not.toHaveBeenCalled();
});

it("rejects an unknown value without writing", async () => {
  await expect(updateStyleProfile({ ...answers, nogos: ["bright"] })).rejects.toThrow();
  expect(mock.update).not.toHaveBeenCalled();
});

it("revalidates every screen that shows or uses the answers", async () => {
  await updateStyleProfile(answers);
  for (const path of ["/settings", "/settings/style", "/profile", "/generate"]) {
    expect(mock.revalidate).toHaveBeenCalledWith(path);
  }
});
