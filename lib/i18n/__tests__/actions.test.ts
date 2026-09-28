import { beforeEach, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  set: vi.fn(), get: vi.fn(), delete: vi.fn(), from: vi.fn(), getUser: vi.fn(), updateUser: vi.fn(),
  read: vi.fn(), update: vi.fn(), write: vi.fn(), captureMessage: vi.fn(),
  after: vi.fn(), prewarm: vi.fn(), createClient: vi.fn(), callbacks: [] as Array<() => Promise<void>>,
}));
vi.mock("next/headers", () => ({ cookies: async () => mock }));
vi.mock("@sentry/nextjs", () => ({ captureMessage: mock.captureMessage }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mock.createClient }));
vi.mock("next/server", () => ({ after: mock.after }));
vi.mock("@/lib/outfits/today-text", () => ({ prewarmTodayTexts: mock.prewarm }));
import { setLocale } from "../actions";

beforeEach(() => {
  vi.resetAllMocks();
  mock.callbacks.length = 0;
  mock.after.mockImplementation((callback) => mock.callbacks.push(callback));
  mock.createClient.mockResolvedValue({ auth: mock, from: mock.from });
  mock.prewarm.mockResolvedValue(undefined);
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
  expect(mock.after).not.toHaveBeenCalled();
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
  expect(mock.after).not.toHaveBeenCalled();
});

it.each(["read", "write"] as const)("a failed profile %s leaves an account-bound retry marker", async (stage) => {
  mock[stage].mockResolvedValue({ data: null, error: new Error("private provider details") });
  expect(await setLocale("uk")).toEqual({ status: "ok" });
  expect(mock.set).toHaveBeenCalledWith("FITCHECK_PENDING_LOCALE", "user:uk", expect.objectContaining({ httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 }));
  expect(mock.updateUser).not.toHaveBeenCalled();
  expect(mock.delete).not.toHaveBeenCalled();
  expect(mock.captureMessage).toHaveBeenCalledWith("locale preference not saved", "warning");
  if (stage === "read") expect(mock.update).not.toHaveBeenCalled();
  expect(mock.after).toHaveBeenCalledTimes(stage === "read" ? 0 : 1);
});

it("schedules with the saved timezone and returns before background work", async () => {
  mock.read.mockResolvedValue({ data: { preferences: {}, location_timezone: "America/Los_Angeles" }, error: null });
  mock.prewarm.mockReturnValue(new Promise(() => {}));
  expect(await setLocale("uk")).toEqual({ status: "ok" });
  expect(mock.after).toHaveBeenCalledOnce();
  expect(mock.prewarm).not.toHaveBeenCalled();
  void mock.callbacks[0]();
  expect(mock.prewarm).toHaveBeenCalledWith(expect.objectContaining({ auth: mock }), "user", "uk", "America/Los_Angeles");
});

it("captures each switch without background preference writes or new request clients", async () => {
  await setLocale("uk");
  await setLocale("en-GB");
  expect(mock.createClient).toHaveBeenCalledTimes(2);
  expect(mock.getUser).toHaveBeenCalledTimes(2);
  const writes = mock.update.mock.calls.length;
  const cookieWrites = mock.set.mock.calls.length;
  await Promise.all(mock.callbacks.map(callback => callback()));
  expect(mock.prewarm.mock.calls.map(call => call.slice(1))).toEqual([
    ["user", "uk", "UTC"], ["user", "en-GB", "UTC"],
  ]);
  expect(mock.createClient).toHaveBeenCalledTimes(2);
  expect(mock.getUser).toHaveBeenCalledTimes(2);
  expect(mock.update).toHaveBeenCalledTimes(writes);
  expect(mock.set).toHaveBeenCalledTimes(cookieWrites);
  expect(mock.update).toHaveBeenLastCalledWith({ preferences: expect.objectContaining({ locale: "en-GB" }) });
});

it("a missing profile is a read failure with no speculative prewarm", async () => {
  mock.read.mockResolvedValue({ data: null, error: null });
  expect(await setLocale("uk")).toEqual({ status: "ok" });
  expect(mock.after).not.toHaveBeenCalled();
  expect(mock.update).not.toHaveBeenCalled();
  expect(mock.set).toHaveBeenCalledWith("FITCHECK_PENDING_LOCALE", "user:uk", expect.any(Object));
});

it("a background failure is private and cannot undo the language choice", async () => {
  mock.prewarm.mockRejectedValue(new Error("private source prose"));
  await setLocale("uk");
  await mock.callbacks[0]();
  expect(mock.captureMessage).toHaveBeenCalledWith("look translation prewarm failed", "warning");
  expect(mock.update).toHaveBeenCalledOnce();
  expect(mock.updateUser).toHaveBeenCalledOnce();
});

it("metadata failure does not undo a successful profile save", async () => {
  mock.updateUser.mockResolvedValue({ error: new Error("metadata unavailable") });
  expect(await setLocale("uk")).toEqual({ status: "ok" });
  expect(mock.delete).toHaveBeenCalledWith("FITCHECK_PENDING_LOCALE");
  expect(mock.captureMessage).toHaveBeenCalledWith("locale auth metadata not saved", "warning");
});
