import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/app/billing/actions", () => ({ startCheckout: vi.fn(), openBillingPortal: vi.fn() }));
import { ProCard } from "../pro-card";

// Review I1: the server renders in UTC, the phone in its own zone. Anything zone-dependent in server HTML makes React
// throw a hydration mismatch, so the server must render a zone-neutral label and the client fill in the local one.
afterEach(() => vi.restoreAllMocks());

function deviceIn(timeZone: string) {
  const real = Intl.DateTimeFormat.prototype.resolvedOptions;
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockImplementation(function (this: Intl.DateTimeFormat) {
    return { ...real.call(this), timeZone };
  });
}

it("server HTML for the Pro pill does not depend on the device time zone", () => {
  deviceIn("Europe/Berlin");
  const berlin = renderToString(<ProCard tier="free" />);
  vi.restoreAllMocks();
  deviceIn("America/New_York");
  const newYork = renderToString(<ProCard tier="free" />);
  expect(berlin).toBe(newYork);
});

it("after mount the pill shows the device's currency", () => {
  deviceIn("Europe/Berlin");
  render(<ProCard tier="free" />);
  expect(screen.getByRole("button", { name: /fitcheck pro/i })).toHaveTextContent("€5 / month");
});
