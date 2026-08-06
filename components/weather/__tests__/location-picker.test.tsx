import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { LocationPicker } from "../location-picker";

const cities = [
  { name: "Manila", country: "PH", lat: 14.6, lon: 120.98 },
  { name: "Berlin", country: "DE", lat: 52.52, lon: 13.41 },
];

function setup(over: Partial<React.ComponentProps<typeof LocationPicker>> = {}) {
  const onPick = vi.fn();
  const onSearch = vi.fn();
  render(
    <LocationPicker cities={cities} onPick={onPick} onSearch={onSearch} {...over} />,
  );
  return { onPick, onSearch };
}

test("the listbox is labelled and lists the results", () => {
  setup();
  const list = screen.getByRole("listbox", { name: /choose a city/i });
  expect(within(list).getByRole("option", { name: /manila/i })).toBeInTheDocument();
  expect(within(list).getByRole("option", { name: /berlin/i })).toBeInTheDocument();
});

test("the current city is marked selected, so a screen reader knows where you are", () => {
  setup({ currentLabel: "Berlin" });
  expect(screen.getByRole("option", { name: /berlin/i })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("option", { name: /manila/i })).toHaveAttribute("aria-selected", "false");
});

test("picking a city hands back its coordinates, not just its name", async () => {
  const { onPick } = setup();
  await userEvent.click(screen.getByRole("option", { name: /manila/i }));
  expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ lat: 14.6, lon: 120.98 }));
});

test("typing searches", async () => {
  const { onSearch } = setup();
  await userEvent.type(screen.getByLabelText(/search a city/i), "Man");
  expect(onSearch).toHaveBeenCalled();
});

test("'Use my location' is absent when the browser cannot do it", () => {
  setup();
  expect(screen.queryByRole("button", { name: /use my location/i })).not.toBeInTheDocument();
});

test("'Use my location' is offered when it is supported", async () => {
  const onUseMyLocation = vi.fn();
  setup({ onUseMyLocation });
  await userEvent.click(screen.getByRole("button", { name: /use my location/i }));
  expect(onUseMyLocation).toHaveBeenCalled();
});

test("every option is at least 44px tall — this is a phone", () => {
  setup({ onUseMyLocation: vi.fn() });
  for (const o of screen.getAllByRole("option")) {
    expect(o.className).toMatch(/min-h-11/);
  }
});
