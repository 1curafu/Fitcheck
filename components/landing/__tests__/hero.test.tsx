import { render, screen } from "@testing-library/react";
import enUS from "@/messages/en-US.json";
import { SHIPPED_LOCALES } from "@/lib/i18n/locales";
import { STARTER_PIECES } from "@/lib/landing/example-looks";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// The language menu imports the setLocale Server Action, which is server-only outside Next.
vi.mock("@/lib/i18n/actions", () => ({ setLocale: vi.fn() }));

import { Hero } from "../hero";
import { TopBar } from "../top-bar";

test("the hero states the promise and sends the CTA to sign-in", async () => {
  render(await Hero());
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(`${enUS.home.hero.titleLead} ${enUS.home.hero.titleEmphasis}`);
  expect(screen.getByRole("link", { name: enUS.home.hero.cta })).toHaveAttribute("href", "/sign-in");
  expect(screen.getByText(`Start with ${STARTER_PIECES} pieces`)).toBeInTheDocument();
  expect(screen.getByText(`${SHIPPED_LOCALES.length} languages`)).toBeInTheDocument();
  expect(screen.getAllByRole("tab")).toHaveLength(3);
});

test("the top bar offers sign-in and the language switch", async () => {
  render(await TopBar());
  expect(screen.getByRole("link", { name: enUS.home.nav.signIn })).toHaveAttribute("href", "/sign-in");
  expect(screen.getByRole("navigation", { name: enUS.home.nav.label })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "English (US)" })).toHaveAttribute("aria-haspopup", "dialog");
});
