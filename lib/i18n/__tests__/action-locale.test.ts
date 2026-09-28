import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.unmock("@/lib/i18n/action-locale");
const get = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ headers: async () => ({ get }) }));
import { getActionLocale } from "../action-locale";

it.each(["en-US", "en-GB", "uk"])("actions use proxy locale %s", async locale => {
  get.mockReturnValue(locale);
  expect(await getActionLocale()).toBe(locale);
  expect(get).toHaveBeenCalledWith("X-NEXT-INTL-LOCALE");
});
it.each([null, "de", "../x"])("unknown action locale %s falls back to en-US", async locale => {
  get.mockReturnValue(locale);
  expect(await getActionLocale()).toBe("en-US");
});
