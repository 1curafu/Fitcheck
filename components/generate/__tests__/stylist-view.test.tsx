import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StylistView } from "../stylist-view";
import type { Look, WeatherPayload } from "@/lib/generator/types";

const weather: WeatherPayload = {
  tempC: 14,
  feelsLikeC: 12,
  condition: "Overcast",
  cityLabel: "Berlin",
  timezone: "Europe/Berlin",
  locationOrigin: "default" as const,
  laterSentence: "Dry through the evening — no extra layer.",
  adviceClause: "no extra layer.",
  laterLabel: "Later",
  hourly: [],
};

const look: Look = {
  name: "The Camel",
  why: "the camel coat does the talking",
  anchorIndex: 0,
  pieces: [
    {
      itemId: "i1",
      category: "Outerwear",
      subcategory: null,
      brand: "Uniqlo U",
      name: "Camel coat",
      colors: [],
      cutoutUrl: "/a.png",
      slot: { xPct: 6, yPct: 8, wPct: 46, hPct: 64, rotationDeg: -5, z: 3 },
    },
  ],
};

const noop = () => {};
const base = {
  weather,
  looks: [] as Look[],
  selectedLook: 0,
  occasion: "everyday" as const,
  cities: [],
  refineOpen: false,
  locating: false,
  geoError: null,
  onOccasion: noop,
  onOpenRefine: noop,
  onCloseRefine: noop,
  onRefineApply: noop,
  onCityChange: noop,
  onCitySearch: noop,
  onSelectLook: noop,
  onRetry: noop,
  onRegenerate: noop,
  onOpenItem: noop,
};

test("loading (D10): skeleton shown, no outfit image", () => {
  render(<StylistView {...base} status="loading" />);
  expect(screen.getByTestId("stylist-skeleton")).toBeInTheDocument();
  expect(screen.queryAllByRole("img")).toHaveLength(0);
});

test("empty (D10): generic copy when we can't name the gap", () => {
  render(<StylistView {...base} status="empty" />);
  expect(screen.getByText("Add a few more pieces to unlock outfits")).toBeInTheDocument();
});

test("empty: names the missing slot and the occasion instead of a generic nudge", () => {
  render(<StylistView {...base} status="empty" missing="Shoes" occasion="evening" />);
  const body = screen.getByTestId("empty-copy").textContent ?? "";
  expect(body).toMatch(/shoes/i); // WHICH gap
  expect(body).toMatch(/evening/i); // for WHICH occasion
  // and it must not fall back to the vague nudge
  expect(screen.queryByText("Add a few more pieces to unlock outfits")).toBeNull();
});


test("error (D10): the retry control re-invokes onRetry", async () => {
  const onRetry = vi.fn();
  render(<StylistView {...base} status="error" onRetry={onRetry} />);
  await userEvent.click(screen.getByRole("button", { name: /try again/i }));
  expect(onRetry).toHaveBeenCalled();
});

test("ok (D3): the active look's index name and its byline name are the same single string", () => {
  render(<StylistView {...base} status="ok" looks={[look]} />);
  expect(screen.getAllByText("The Camel").length).toBeGreaterThanOrEqual(2); // index tab + why byline
});

// The daily drop (Decision 5): a new set of looks is an explicit choice the
// user makes, never a side effect of browsing between occasions.
test("Regenerate is offered as an explicit action", async () => {
  const onRegenerate = vi.fn();
  render(<StylistView {...base} status="ok" looks={[look]} onRegenerate={onRegenerate} />);
  await userEvent.click(screen.getByRole("button", { name: /regenerate/i }));
  expect(onRegenerate).toHaveBeenCalledTimes(1);
});
