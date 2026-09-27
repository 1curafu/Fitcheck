import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("next-intl/server", async (importOriginal) => ({
  ...await importOriginal<typeof import("next-intl/server")>(),
  getLocale: async () => "en-US",
}));

// Existing feature tests mock Next's router locally. Delegate the locale-aware
// facade to those mocks so the tests keep exercising each feature's behavior.
vi.mock("@/lib/i18n/navigation", async () => {
  const navigation = await import("next/navigation");
  const link = await import("next/link");
  return {
    Link: link.default,
    useRouter: () => navigation.useRouter(),
    usePathname: () => navigation.usePathname(),
    redirect: (args: { href: string } | string, type?: Parameters<typeof navigation.redirect>[1]) =>
      navigation.redirect(typeof args === "string" ? args : args.href, type),
    getPathname: ({ href }: { href: string }) => href,
  };
});

// jsdom has no matchMedia; motion's useReducedMotion() needs it. Default: no preference.
// Tests that exercise the reduced-motion path override this before render.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// jsdom here exposes the `Storage` constructor but no `localStorage` instance,
// so anything touching it reads `undefined`. Same shape of gap as matchMedia
// above. A Map is enough: the point is that reads and writes round-trip and that
// `clear()` between tests really empties it.
if (!window.localStorage) {
  const store = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (key: string) => store.get(key) ?? null,
      key: (i: number) => [...store.keys()][i] ?? null,
      removeItem: (key: string) => void store.delete(key),
      setItem: (key: string, value: string) => void store.set(key, String(value)),
    } satisfies Storage,
  });
}
