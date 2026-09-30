import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mock = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn(), getUser: vi.fn(), read: vi.fn(), update: vi.fn(), write: vi.fn(), updateUser: vi.fn(), captureMessage: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureMessage: mock.captureMessage }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: mock,
  from: () => ({ select: () => ({ eq: () => ({ single: mock.read }) }), update: mock.update }),
}) }));
import { GET } from "../route";

beforeEach(() => {
  vi.resetAllMocks();
  mock.exchangeCodeForSession.mockResolvedValue({ error: null });
  mock.getUser.mockResolvedValue({ data: { user: { id: "user" } }, error: null });
  mock.read.mockResolvedValue({ data: { preferences: {} }, error: null });
  mock.update.mockReturnValue({ eq: mock.write });
  mock.write.mockResolvedValue({ error: null });
  mock.updateUser.mockResolvedValue({ error: null });
});

const request = (cookie = "NEXT_LOCALE=uk", next = "/onboarding", code = "c") =>
  new NextRequest(`https://fitcheck.space/auth/callback?code=${code}&next=${encodeURIComponent(next)}`, { headers: { cookie } });

it("localizes the first sign-in and persists language and initial units", async () => {
  const response = await GET(request());
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe("https://fitcheck.space/uk/onboarding");
  expect(response.cookies.get("NEXT_LOCALE")?.value).toBe("uk");
  expect(mock.update).toHaveBeenCalledWith({ preferences: expect.objectContaining({ locale: "uk", tempUnit: "C" }) });
  expect(mock.write).toHaveBeenCalledWith("id", "user");
  expect(mock.updateUser).toHaveBeenCalledWith({ data: { locale: "uk" } });
});

it("the saved account language wins over an ordinary browsing cookie", async () => {
  mock.read.mockResolvedValue({ data: { preferences: { locale: "en-GB" } }, error: null });
  const response = await GET(request());
  expect(response.headers.get("location")).toBe("https://fitcheck.space/en-gb/onboarding");
  expect(response.cookies.get("NEXT_LOCALE")?.value).toBe("en-GB");
  expect(mock.update).not.toHaveBeenCalled();
});

it("keeps the initiating page language for a first sign-in without a locale cookie", async () => {
  const response = await GET(new NextRequest("https://fitcheck.space/auth/callback?code=c&next=/onboarding&locale=uk"));
  expect(response.headers.get("location")).toBe("https://fitcheck.space/uk/onboarding");
  expect(mock.update).toHaveBeenCalledWith({ preferences: expect.objectContaining({ locale: "uk" }) });
});

it("retries and clears a marker for this account only after a successful save", async () => {
  mock.read.mockResolvedValue({ data: { preferences: { locale: "en-GB", tempUnit: "F" } }, error: null });
  const response = await GET(request("NEXT_LOCALE=en-GB; FITCHECK_PENDING_LOCALE=user:uk"));
  expect(response.headers.get("location")).toBe("https://fitcheck.space/uk/onboarding");
  expect(mock.update).toHaveBeenCalledWith({ preferences: expect.objectContaining({ locale: "uk", tempUnit: "F" }) });
  expect(response.cookies.get("FITCHECK_PENDING_LOCALE")?.value).toBe("");
});

it.each(["other:uk", "user:pl", "malformed"])("ignores a foreign or invalid marker %s", async (marker) => {
  mock.read.mockResolvedValue({ data: { preferences: { locale: "en-GB" } }, error: null });
  const response = await GET(request(`NEXT_LOCALE=uk; FITCHECK_PENDING_LOCALE=${marker}`));
  expect(response.headers.get("location")).toBe("https://fitcheck.space/en-gb/onboarding");
  expect(mock.update).not.toHaveBeenCalled();
  expect(response.cookies.get("FITCHECK_PENDING_LOCALE")).toBeUndefined();
});

it("a failed profile read cannot promote browsing language over the saved account language", async () => {
  mock.read.mockResolvedValueOnce({ data: null, error: new Error("unavailable") });
  const first = await GET(request());
  expect(first.cookies.get("FITCHECK_PENDING_LOCALE")).toBeUndefined();
  expect(mock.update).not.toHaveBeenCalled();
  expect(mock.updateUser).not.toHaveBeenCalled();
  mock.read.mockResolvedValueOnce({ data: { preferences: { locale: "en-GB" } }, error: null });
  const second = await GET(request(`NEXT_LOCALE=${first.cookies.get("NEXT_LOCALE")?.value}`));
  expect(second.headers.get("location")).toBe("https://fitcheck.space/en-gb/onboarding");
  expect(mock.update).not.toHaveBeenCalled();
});

it("a profile read failure retains an explicit same-account pending choice", async () => {
  mock.read.mockResolvedValue({ data: null, error: new Error("unavailable") });
  const response = await GET(request("NEXT_LOCALE=en-GB; FITCHECK_PENDING_LOCALE=user:uk"));
  expect(response.headers.get("location")).toBe("https://fitcheck.space/uk/onboarding");
  expect(response.cookies.get("FITCHECK_PENDING_LOCALE")?.value).toBe("user:uk");
  expect(mock.update).not.toHaveBeenCalled();
});

it("profile write failure still redirects and preserves a retry marker", async () => {
  mock.write.mockResolvedValue({ data: null, error: new Error("private provider details") });
  const response = await GET(request());
  expect(response.headers.get("location")).toBe("https://fitcheck.space/uk/onboarding");
  expect(response.cookies.get("FITCHECK_PENDING_LOCALE")?.value).toBe("user:uk");
  expect(mock.captureMessage).toHaveBeenCalledWith("sign-in locale preference not saved", "warning");
});

it("a failed retry retains the pending choice over an older saved locale", async () => {
  mock.read.mockResolvedValue({ data: { preferences: { locale: "en-GB" } }, error: null });
  mock.write.mockResolvedValue({ error: new Error("unavailable") });
  const response = await GET(request("NEXT_LOCALE=en-GB; FITCHECK_PENDING_LOCALE=user:uk"));
  expect(response.headers.get("location")).toBe("https://fitcheck.space/uk/onboarding");
  expect(response.cookies.get("FITCHECK_PENDING_LOCALE")?.value).toBe("user:uk");
});

it.each(["//evil.com", "/\\evil.com"])("rejects external next=%s", async (next) => {
  const response = await GET(request("NEXT_LOCALE=uk", next));
  expect(response.headers.get("location")).toBe("https://fitcheck.space/uk/onboarding");
});

it.each(["/\n/evil.com", "/\t/evil.com"])("rejects next paths that URL parsing turns into external destinations", async (next) => {
  const response = await GET(request("NEXT_LOCALE=en-US", next));
  expect(response.headers.get("location")).toBe("https://fitcheck.space/onboarding");
});

it("localizes failed authentication without any preference writes", async () => {
  mock.exchangeCodeForSession.mockResolvedValue({ error: new Error("exchange failed") });
  const response = await GET(request());
  expect(response.headers.get("location")).toBe("https://fitcheck.space/uk/sign-in?error=auth");
  expect(mock.read).not.toHaveBeenCalled();
  expect(mock.update).not.toHaveBeenCalled();
});

it("does not use profile authority without an authenticated user", async () => {
  mock.getUser.mockResolvedValue({ data: { user: null }, error: null });
  const response = await GET(request());
  expect(response.headers.get("location")).toBe("https://fitcheck.space/uk/sign-in?error=auth");
  expect(mock.read).not.toHaveBeenCalled();
});

it("metadata failure does not block the saved profile language", async () => {
  mock.updateUser.mockResolvedValue({ error: new Error("metadata unavailable") });
  const response = await GET(request());
  expect(response.headers.get("location")).toBe("https://fitcheck.space/uk/onboarding");
  expect(mock.captureMessage).toHaveBeenCalledWith("sign-in locale auth metadata not saved", "warning");
});
