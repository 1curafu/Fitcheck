import { loadFonts } from "../render";

it("share fonts include Cyrillic faces and load their glyphs", async () => {
  const vars: Record<string, string> = {
    "--font-libre-caslon": "'Caslon'", "--font-serif-cyrillic": "'Garamond Cyr'",
    "--font-hanken": "'Hanken'", "--font-sans-cyrillic": "'Inter Cyr'",
  };
  vi.spyOn(window, "getComputedStyle").mockReturnValue({ getPropertyValue: (key: string) => vars[key] ?? "" } as never);
  const load = vi.fn(async (_font: string, _glyphs?: string) => []);
  Object.defineProperty(document, "fonts", { value: { load }, configurable: true });
  const fonts = await loadFonts();
  expect(fonts.serif).toBe("'Caslon', 'Garamond Cyr'");
  expect(fonts.sans).toBe("'Hanken', 'Inter Cyr'");
  expect(load.mock.calls.every(call => call[1]?.includes("Ж"))).toBe(true);
});
