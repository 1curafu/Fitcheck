import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { SettingsView } from "../settings-view";
import type { Preferences } from "@/lib/profile/preferences";

const props: {
  name: string;
  email: string;
  initials: string;
  locationLabel: string | null;
  preferences: Preferences;
} = {
  name: "Mykhailo",
  email: "icurafu333@gmail.com",
  initials: "M",
  locationLabel: "Berlin",
  preferences: { rainGuard: true, tempUnit: "C" },
};

function renderSettings(over: Partial<typeof props> = {}, onSaveAction = vi.fn()) {
  render(<SettingsView {...props} {...over} onSaveAction={onSaveAction} />);
  return onSaveAction;
}

test("the account row shows name and email", () => {
  renderSettings();
  expect(screen.getByText("Mykhailo")).toBeInTheDocument();
  expect(screen.getByText("icurafu333@gmail.com")).toBeInTheDocument();
});

test("each live toggle exposes its state to screen readers", () => {
  renderSettings();
  expect(screen.getByRole("switch", { name: /rain guard/i })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  expect(screen.getByRole("switch", { name: /metric units/i })).toHaveAttribute(
    "aria-checked",
    "true",
  );
});

test("a stored preference is reflected, not assumed", () => {
  renderSettings({ preferences: { rainGuard: false, tempUnit: "F" } });
  expect(screen.getByRole("switch", { name: /rain guard/i })).toHaveAttribute(
    "aria-checked",
    "false",
  );
  expect(screen.getByRole("switch", { name: /metric units/i })).toHaveAttribute(
    "aria-checked",
    "false",
  );
});

test("toggling rain guard saves the patch and flips immediately", async () => {
  const onSaveAction = renderSettings();
  const sw = screen.getByRole("switch", { name: /rain guard/i });
  await userEvent.click(sw);
  expect(onSaveAction).toHaveBeenCalledWith({ rainGuard: false });
  // Optimistic: a switch that waits for a round trip reads as broken.
  expect(sw).toHaveAttribute("aria-checked", "false");
});

test("the units switch saves a unit, not a boolean", async () => {
  const onSaveAction = renderSettings();
  await userEvent.click(screen.getByRole("switch", { name: /metric units/i }));
  expect(onSaveAction).toHaveBeenCalledWith({ tempUnit: "F" });
});

test("a failed save reverts the switch rather than lying about it", async () => {
  const onSaveAction = vi.fn().mockRejectedValue(new Error("offline"));
  renderSettings({}, onSaveAction);
  const sw = screen.getByRole("switch", { name: /rain guard/i });
  await userEvent.click(sw);
  expect(await screen.findByRole("status")).toHaveTextContent(/couldn.t save/i);
  expect(sw).toHaveAttribute("aria-checked", "true");
});

test("deferred controls are visible but disabled, and say so", () => {
  renderSettings();
  expect(screen.getByRole("button", { name: /deutsch/i })).toBeDisabled();
  expect(screen.getByText(/soon/i)).toBeInTheDocument();
});

test("no toggle is rendered for a preference nothing reads", () => {
  renderSettings();
  // The daily fit reminder needs web-push: no service worker, no VAPID keys and
  // no scheduler exist. A switch that schedules nothing is worse than no switch,
  // so it ships with the notifications plan instead.
  expect(screen.queryByRole("switch", { name: /reminder/i })).not.toBeInTheDocument();
});

test("the Pro card is NOT duplicated here", () => {
  renderSettings();
  // The design draws a Pro banner on this screen too (:794). One entry point
  // only, on the profile hub — two cards can disagree about what Pro is, which
  // is the whole reason UpgradeSheet is shared.
  expect(screen.queryByText(/€5/)).not.toBeInTheDocument();
  expect(screen.queryByText(/go pro/i)).not.toBeInTheDocument();
});

test("location is shown read-only, with no control implying otherwise", () => {
  renderSettings();
  const row = screen.getByTestId("location-row");
  expect(within(row).getByText("Berlin")).toBeInTheDocument();
  expect(within(row).queryByRole("button")).not.toBeInTheDocument();
});

test("the location row says where to change it, rather than being a dead end", () => {
  renderSettings();
  // The picker lives on the Stylist screen. A value with no affordance and no
  // hint is the question this row kept prompting.
  expect(within(screen.getByTestId("location-row")).getByText(/stylist/i)).toBeInTheDocument();
});

test("location falls back to a plain phrase when the profile has none", () => {
  renderSettings({ locationLabel: null });
  expect(within(screen.getByTestId("location-row")).getByText(/not set/i)).toBeInTheDocument();
});

test("sign out is present and posts to the sign-out route", () => {
  renderSettings();
  const button = screen.getByRole("button", { name: /sign out/i });
  expect(button).toBeInTheDocument();
  expect(button.closest("form")).toHaveAttribute("action", "/auth/signout");
});
