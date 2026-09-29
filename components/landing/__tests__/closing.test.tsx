import { render, screen } from "@testing-library/react";
import enUS from "@/messages/en-US.json";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
// The language menu imports the setLocale Server Action, which is server-only outside Next.
vi.mock("@/lib/i18n/actions", () => ({ setLocale: vi.fn() }));

import { FinalCta } from "../final-cta";
import { Footer } from "../footer";
import { Trust } from "../trust";

test("the trust section states four code-backed facts and links the legal pages", async () => {
  render(await Trust());
  for (const k of ["device", "storage", "ai", "cookies"] as const)
    expect(screen.getByRole("heading", { name: enUS.home.trust[k].title })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: enUS.legal.privacy.title })).toHaveAttribute("href", "/privacy");
  expect(screen.getByRole("link", { name: enUS.legal.terms.title })).toHaveAttribute("href", "/terms");
});

test("the final CTA is the sticky bar's stop marker and goes to sign-in", async () => {
  render(await FinalCta());
  const link = screen.getByRole("link", { name: enUS.home.hero.cta });
  expect(link).toHaveAttribute("id", "final-cta");
  expect(link).toHaveAttribute("href", "/sign-in");
});

test("the footer carries legal and sign-in links and the language switch", async () => {
  render(await Footer());
  expect(screen.getByRole("button", { name: "English (US)" })).toHaveAttribute("aria-haspopup", "dialog");
  expect(screen.getByRole("navigation", { name: enUS.home.footer.legal })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: enUS.legal.privacy.title })).toHaveAttribute("href", "/privacy");
  expect(screen.getByRole("link", { name: enUS.legal.terms.title })).toHaveAttribute("href", "/terms");
  expect(screen.getByRole("link", { name: enUS.home.nav.signIn })).toHaveAttribute("href", "/sign-in");
});
