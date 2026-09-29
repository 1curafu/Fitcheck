import { expect, it, vi, beforeEach } from "vitest";
const rootLocale = vi.hoisted(() => vi.fn());
vi.mock("next/root-params", () => ({ locale: rootLocale }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("404"); } }));
vi.mock("next-intl/server", () => ({ getRequestConfig: (callback: unknown) => callback }));
import config from "../request";
beforeEach(() => { rootLocale.mockReset(); });

it("route renders read the root locale for static shells", async () => {
  rootLocale.mockResolvedValue("uk");
  const result = await config({ locale: undefined, requestLocale: Promise.resolve(undefined) });
  expect(result.locale).toBe("uk");
  expect(rootLocale).toHaveBeenCalledOnce();
});
it("explicit action locale never reads unsupported root params", async () => {
  rootLocale.mockRejectedValue(new Error("root params unavailable in actions"));
  const result = await config({ locale: "uk", requestLocale: Promise.resolve("en-US") });
  expect(result.locale).toBe("uk");
  expect(rootLocale).not.toHaveBeenCalled();
});
it("unsupported overrides fail closed", async () => {
  await expect(config({ locale: "pl" as never, requestLocale: Promise.resolve(undefined) })).rejects.toThrow("404");
  expect(rootLocale).not.toHaveBeenCalled();
});
