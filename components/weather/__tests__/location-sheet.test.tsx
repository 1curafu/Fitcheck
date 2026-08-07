import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { LocationSheet } from "../location-sheet";

const cities = [
  { name: "Manila", country: "PH", lat: 14.6, lon: 120.98 },
  { name: "Berlin", country: "DE", lat: 52.52, lon: 13.41 },
];

function setup(over: Partial<React.ComponentProps<typeof LocationSheet>> = {}) {
  const onPick = vi.fn();
  const onClose = vi.fn();
  const onSearch = vi.fn();
  render(
    <LocationSheet
      open
      cities={cities}
      onPick={onPick}
      onClose={onClose}
      onSearch={onSearch}
      {...over}
    />,
  );
  return { onPick, onClose, onSearch };
}

test("a closed sheet renders nothing at all", () => {
  render(
    <LocationSheet open={false} cities={cities} onPick={vi.fn()} onClose={vi.fn()} onSearch={vi.fn()} />,
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  // Not merely hidden: a listbox that is still in the tree is still reachable
  // by a screen reader and still focusable.
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
});

test("it is a modal dialog with a name", () => {
  setup();
  const dialog = screen.getByRole("dialog", { name: /location/i });
  expect(dialog).toHaveAttribute("aria-modal", "true");
});

test("it sits ABOVE the bottom nav, and is fixed rather than absolute", () => {
  // MobileNav is z-50 and renders after the page content, so at equal z-index it
  // paints straight over a sheet's controls. RefineSheet shipped with exactly
  // this bug, and being `absolute` inside an overflow-hidden <main> clipped it
  // outright — its colour palette and primary button were unreachable.
  setup();
  const dialog = screen.getByRole("dialog");
  expect(dialog.className).toMatch(/\bfixed\b/);
  expect(dialog.className).toMatch(/z-\[70\]/);
  expect(dialog.className).not.toMatch(/\babsolute\b/);
});

test("picking a city hands back coordinates, not just a name", async () => {
  const { onPick } = setup();
  await userEvent.click(screen.getByRole("option", { name: /manila/i }));
  expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ lat: 14.6, lon: 120.98 }));
});

test("the current city is marked selected", () => {
  setup({ currentLabel: "Berlin" });
  expect(screen.getByRole("option", { name: /berlin/i })).toHaveAttribute("aria-selected", "true");
});

test("the backdrop dismisses it — a sheet you cannot leave is a trap", async () => {
  const { onClose } = setup();
  await userEvent.click(screen.getByRole("button", { name: /^close$/i }));
  expect(onClose).toHaveBeenCalled();
});

test("Cancel dismisses it too", async () => {
  const { onClose } = setup();
  await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
  expect(onClose).toHaveBeenCalled();
});

test("'Use my location' appears only when the browser supports it", async () => {
  setup();
  expect(screen.queryByRole("button", { name: /use my location/i })).not.toBeInTheDocument();

  const onUseMyLocation = vi.fn();
  const { unmount } = render(
    <LocationSheet
      open
      cities={cities}
      onPick={vi.fn()}
      onClose={vi.fn()}
      onSearch={vi.fn()}
      onUseMyLocation={onUseMyLocation}
    />,
  );
  await userEvent.click(screen.getAllByRole("button", { name: /use my location/i })[0]);
  expect(onUseMyLocation).toHaveBeenCalled();
  unmount();
});

test("locating and geo errors are announced", () => {
  const { unmount } = render(
    <LocationSheet open cities={[]} onPick={vi.fn()} onClose={vi.fn()} onSearch={vi.fn()} locating />,
  );
  expect(screen.getByRole("status")).toHaveTextContent(/locating/i);
  unmount();

  render(
    <LocationSheet
      open
      cities={[]}
      onPick={vi.fn()}
      onClose={vi.fn()}
      onSearch={vi.fn()}
      geoError="Location access is off — search for a city instead."
    />,
  );
  expect(screen.getByRole("status")).toHaveTextContent(/location access is off/i);
});

test("the results list scrolls instead of growing the sheet off-screen", () => {
  // The whole reason this is a sheet: an unbounded list pushes its own primary
  // controls past the bottom of the viewport.
  setup();
  const box = screen.getByTestId("location-results");
  expect(box.className).toMatch(/overflow-y-auto/);
  expect(box.className).toMatch(/max-h-/);
});

test("the picker inside carries no surface of its own", () => {
  // The defect this redesign fixes: the overlay variant nested inside another
  // card gave two borders and two backgrounds.
  setup();
  const list = screen.getByRole("listbox");
  expect(list.className).not.toMatch(/bg-surface-3/);
  expect(list.className).not.toMatch(/\bborder\b/);
});
