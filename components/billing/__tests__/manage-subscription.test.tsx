import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
const { openBillingPortal } = vi.hoisted(() => ({ openBillingPortal: vi.fn() }));
vi.mock("@/app/billing/actions", () => ({ openBillingPortal, startCheckout: vi.fn() }));
import { ManageSubscription } from "../manage-subscription";

it("shows the subscription state and opens the portal", async () => {
  openBillingPortal.mockResolvedValue({ status: "error" });
  render(
    <ManageSubscription status="active" interval="month" currentPeriodEnd="2026-10-12T08:00:00.000Z" cancelAtPeriodEnd={false} />,
  );
  expect(screen.getByText(/renews/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /manage subscription/i }));
  expect(openBillingPortal).toHaveBeenCalledOnce();
  expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t open billing/i);
});
