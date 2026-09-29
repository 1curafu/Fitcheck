import { render, screen, within } from "@testing-library/react";
import enUS from "@/messages/en-US.json";
import { PRO_BENEFIT_KEYS } from "@/lib/billing/benefits";
import { FREE } from "@/lib/billing/tiers";

vi.mock("@/lib/billing/use-client-time-zone", () => ({ useClientTimeZone: () => "Europe/Berlin" }));

import { Features } from "../features";
import { Plans } from "../plans";

test("the Pro grid shows every upgrade-sheet benefit, labelled Pro, plus free sharing", async () => {
  render(await Features());
  for (const key of PRO_BENEFIT_KEYS) {
    const card = screen.getByRole("heading", { name: enUS.billing.benefits[key].label }).closest("li")!;
    expect(within(card).getByText(enUS.home.features.pro)).toBeInTheDocument();
  }
  const share = screen.getByRole("heading", { name: enUS.home.features.share.title }).closest("li")!;
  expect(within(share).getByText(enUS.home.features.free)).toBeInTheDocument();
});

test("the free plan's numbers come from tiers.ts and the prices from prices.ts", async () => {
  render(await Plans());
  expect(screen.getByText(`Regenerate ${FREE.regeneratesPerDay} times a day`)).toBeInTheDocument();
  expect(screen.getByText(`Up to ${FREE.closetItems} pieces in your closet`)).toBeInTheDocument();
  expect(screen.getByText("€5")).toBeInTheDocument();
  expect(screen.getByText("a month, or €50 a year")).toBeInTheDocument();
  expect(screen.getByText("€0")).toBeInTheDocument();
  for (const key of PRO_BENEFIT_KEYS) expect(screen.getByText(enUS.billing.benefits[key].label)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: enUS.home.hero.cta })).toHaveAttribute("href", "/sign-in");
});
