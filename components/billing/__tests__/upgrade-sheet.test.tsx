import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { startCheckout } = vi.hoisted(() => ({ startCheckout: vi.fn() }));
vi.mock("@/app/billing/actions", () => ({ startCheckout, openBillingPortal: vi.fn() }));
import { UpgradeSheet } from "../upgrade-sheet";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "1");
});
afterEach(() => vi.unstubAllEnvs());

const open = (tz = "Europe/Berlin", isPro = false) =>
  render(<UpgradeSheet open title="Get the whole wardrobe working" onClose={() => {}} timeZone={tz} isPro={isPro} />);

it("Go Pro is disabled until the waiver is ticked", async () => {
  open();
  const go = screen.getByRole("button", { name: /^go pro$/i });
  expect(go).toBeDisabled();
  await userEvent.click(screen.getByRole("checkbox", { name: /start pro now/i }));
  expect(go).toBeEnabled();
});

it("offers both plans as rows with their prices, annual selected by default", () => {
  open("Europe/Zurich");
  expect(screen.getByRole("radio", { name: /annual/i })).toBeChecked();
  expect(screen.getByRole("radio", { name: /monthly/i })).not.toBeChecked();
  expect(screen.getByText("CHF 50 / year")).toBeInTheDocument();
  expect(screen.getByText("CHF 5 / month")).toBeInTheDocument();
  expect(screen.getByText(/2 months free · CHF 4\.17 \/ month/)).toBeInTheDocument();
});

it("the sheet scrolls when it is taller than the screen", () => {
  open();
  expect(screen.getByRole("dialog")).toHaveClass("overflow-y-auto");
});

it("says when the currency is only converted at checkout", () => {
  open("Asia/Tokyo");
  expect(screen.getByText(/charged in your local currency at checkout/i)).toBeInTheDocument();
});

it("submits the chosen interval with the waiver and shows a calm error", async () => {
  startCheckout.mockResolvedValue({ status: "error" });
  open();
  await userEvent.click(screen.getByRole("radio", { name: /monthly/i }));
  await userEvent.click(screen.getByRole("checkbox", { name: /start pro now/i }));
  await userEvent.click(screen.getByRole("button", { name: /^go pro$/i }));
  expect(startCheckout).toHaveBeenCalledWith({ interval: "month", waiverAccepted: true });
  expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t start checkout/i);
});

it("discloses Stripe and Link, with the legal links", () => {
  open();
  expect(screen.getByText(/sold through link/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /terms/i })).toHaveAttribute("href", "/terms");
});

it("stays inert when billing is off", () => {
  vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "");
  open();
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^go pro$/i })).not.toBeInTheDocument();
  expect(screen.getByText(/€5 \/ month/)).toBeInTheDocument();
});

it("a Pro user is not offered a purchase", () => {
  open("Europe/Berlin", true);
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  expect(screen.queryByText(/€5/)).not.toBeInTheDocument();
});

it("a rejected action (network drop, timeout) still ends in the calm message (review M6)", async () => {
  startCheckout.mockRejectedValue(new Error("fetch failed"));
  open();
  await userEvent.click(screen.getByRole("checkbox", { name: /start pro now/i }));
  await userEvent.click(screen.getByRole("button", { name: /^go pro$/i }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t start checkout/i);
});
