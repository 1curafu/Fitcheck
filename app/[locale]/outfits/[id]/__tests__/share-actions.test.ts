import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ getUser: vi.fn(), prepare: vi.fn(), locale: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mock.getUser } }) }));
vi.mock("@/lib/share/store", () => ({ prepare: mock.prepare }));
vi.mock("@/lib/i18n/action-locale", () => ({ getActionLocale: mock.locale }));
import { prepareShare } from "../share-actions";
const id = "77777777-7777-4777-8777-777777777777";
beforeEach(() => {
  vi.resetAllMocks();
  mock.getUser.mockResolvedValue({ data: { user: { id: "owner" } } });
  mock.locale.mockResolvedValue("uk");
});
it("uses the authenticated owner and server locale, ignoring client prose and identity", async () => {
  await prepareShare({ outfitId: id, showBrands: true, userId: "other", locale: "en-GB", name: "injected" } as never);
  expect(mock.prepare).toHaveBeenCalledWith(expect.any(Object), "owner", { outfitId: id, showBrands: true, locale: "uk" });
});
it("signed out cannot prepare a share or read request locale", async () => {
  mock.getUser.mockResolvedValue({ data: { user: null } });
  await expect(prepareShare({ outfitId: id, showBrands: false })).rejects.toThrow("Not authenticated");
  expect(mock.prepare).not.toHaveBeenCalled();
  expect(mock.locale).not.toHaveBeenCalled();
});
it("invalid IDs never reach the store", async () => {
  await expect(prepareShare({ outfitId: "invalid", showBrands: false })).rejects.toThrow("Not found");
  expect(mock.prepare).not.toHaveBeenCalled();
});
