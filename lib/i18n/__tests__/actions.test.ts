import { beforeEach, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  set: vi.fn(), get: vi.fn(), delete: vi.fn(), from: vi.fn(), getUser: vi.fn(), updateUser: vi.fn(),
  read: vi.fn(), update: vi.fn(), write: vi.fn(), captureMessage: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: async () => mock }));
vi.mock("@sentry/nextjs", () => ({ captureMessage: mock.captureMessage }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: mock, from: mock.from }) }));
import { setLocale } from "../actions";

beforeEach(() => {
  vi.resetAllMocks();
  mock.getUser.mockResolvedValue({ data: { user: { id: "user" } } });
  mock.get.mockReturnValue({ value: "user:en-GB" });
  mock.read.mockResolvedValue({ data: { preferences: { rainGuard: false, tempUnit: "F" } }, error: null });
  mock.write.mockResolvedValue({ error: null });
  mock.update.mockReturnValue({ eq: mock.write });
  mock.from.mockReturnValue({ select: () => ({ eq: () => ({ single: mock.read }) }), update: mock.update });
  mock.updateUser.mockResolvedValue({ error: null });
});

it("signed out sets the browsing cookie and preserves another account's marker", async () => {
  mock.getUser.mockResolvedValue({ data: { user: null } });
  expect(await setLocale("uk")).toEqual({ status: "ok" });
  expect(mock.set).toHaveBeenCalledWith("NEXT_LOCALE", "uk", expect.objectContaining({ sameSite: "lax", path: "/" }));
  expect(mock.from).not.toHaveBeenCalled();
  expect(mock.delete).not.toHaveBeenCalled();
});

it("saves the profile and metadata, clearing only this user's marker", async () => {
  await setLocale("uk");
  expect(mock.update).toHaveBeenCalledWith({ preferences: expect.objectContaining({ locale: "uk", tempUnit: "F", rainGuard: false }) });
  expect(mock.write).toHaveBeenCalledWith("id", "user");
  expect(mock.updateUser).toHaveBeenCalledWith({ data: { locale: "uk" } });
  expect(mock.delete).toHaveBeenCalledWith("FITCHECK_PENDING_LOCALE");
  mock.delete.mockClear();
  mock.get.mockReturnValue({ value: "other:uk" });
  await setLocale("en-GB");
  expect(mock.delete).not.toHaveBeenCalled();
});

it.each(["de", "../x"])("rejects unsupported locale %s before any writes", async (locale) => {
  await expect(setLocale(locale)).rejects.toThrow("Unsupported locale");
  expect(mock.set).not.toHaveBeenCalled();
  expect(mock.from).not.toHaveBeenCalled();
});

it.each(["read", "write"] as const)("a failed profile %s leaves an account-bound retry marker", async (stage) => {
  mock[stage].mockResolvedValue({ data: null, error: new Error("private provider details") });
  expect(await setLocale("uk")).toEqual({ status: "ok" });
  expect(mock.set).toHaveBeenCalledWith("FITCHECK_PENDING_LOCALE", "user:uk", expect.objectContaining({ httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 }));
  expect(mock.updateUser).not.toHaveBeenCalled();
  expect(mock.delete).not.toHaveBeenCalled();
  expect(mock.captureMessage).toHaveBeenCalledWith("locale preference not saved", "warning");
  if (stage === "read") expect(mock.update).not.toHaveBeenCalled();
});

it("metadata failure does not undo a successful profile save", async () => {
  mock.updateUser.mockResolvedValue({ error: new Error("metadata unavailable") });
  expect(await setLocale("uk")).toEqual({ status: "ok" });
  expect(mock.delete).toHaveBeenCalledWith("FITCHECK_PENDING_LOCALE");
  expect(mock.captureMessage).toHaveBeenCalledWith("locale auth metadata not saved", "warning");
});
