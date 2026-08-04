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
  id: "o1",
  name: "The Camel",
  why: "the camel coat does the talking",
  anchorIndex: 0,
  worn: false,
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
  reason: "",
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

// "Limited" is a STATE, not an error. A user at their allowance has a working
// app and a clear next step; rendering the error path would tell them the
// product is broken and lose the upgrade moment entirely.
test("limited: the meter explains itself instead of looking broken", () => {
  render(
    <StylistView
      {...base}
      status="limited"
      limitMessage="You've used today's redo for this occasion. Pro regenerates freely."
    />,
  );
  expect(screen.getByText(/used today's redo/i)).toBeInTheDocument();
  expect(screen.queryByText(/couldn't reach the stylist/i)).not.toBeInTheDocument();
});

// The reason comes from the seam, which knows WHICH allowance ran out — a
// hard-coded string here would be wrong for the styled-look gate.
test("limited: the reason is rendered verbatim, not a generic message", () => {
  render(
    <StylistView
      {...base}
      status="limited"
      limitMessage="Building a look around a piece is a Pro feature."
    />,
  );
  expect(screen.getByText(/building a look around a piece/i)).toBeInTheDocument();
});

// Pressing Regenerate must never COST you the looks you already had — being
// refused more is not the same as losing what you have.
test("limited: looks already on screen are kept", () => {
  render(
    <StylistView
      {...base}
      status="limited"
      looks={[look]}
      limitMessage="You've used today's redo for this occasion. Pro regenerates freely."
    />,
  );
  expect(screen.getByText(look.why)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /see the full look/i })).toBeInTheDocument();
});

// The control stays live and opens the Pro sheet. A caption in its place was
// tried first: it read as a validation error rather than a feature you have not
// bought, and left nothing to press, so nothing explained itself.
test("limited: the regenerate control opens the upgrade sheet instead of regenerating", async () => {
  const onRegenerate = vi.fn();
  const onShowUpgrade = vi.fn();
  render(
    <StylistView
      {...base}
      status="limited"
      looks={[look]}
      limitMessage="Pro regenerates freely."
      onRegenerate={onRegenerate}
      onShowUpgrade={onShowUpgrade}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: /regenerate/i }));
  expect(onShowUpgrade).toHaveBeenCalled();
  expect(onRegenerate).not.toHaveBeenCalled();
});

test("the upgrade sheet renders the seam's reason when open", () => {
  render(
    <StylistView
      {...base}
      status="limited"
      looks={[look]}
      upgradeOpen
      limitMessage="You've used today's redo for this occasion. Pro regenerates freely."
    />,
  );
  expect(screen.getByRole("dialog")).toHaveTextContent(/used today's redo/i);
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

// Until now a look on the stylist screen had nowhere to go — loadDailyLooks
// never even selected the outfit id, so the detail screen was unreachable.
// A named control, not the flat-lay itself: a whole-image link with no visible
// affordance was tried and is not discoverable (design :312 names the button).
test("a look links to its own detail screen from a named control", () => {
  render(<StylistView {...base} status="ok" looks={[look]} />);
  expect(screen.getByRole("link", { name: /see the full look/i })).toHaveAttribute(
    "href",
    "/outfits/o1",
  );
});

// Wearing a look pins it: it stays in the day's set instead of vanishing, so the
// screen has to say why it looks different from the others.
test("a look already worn today is badged as worn", () => {
  render(<StylistView {...base} status="ok" looks={[{ ...look, worn: true }]} />);
  expect(screen.getByText(/worn today/i)).toBeInTheDocument();
});

test("an unworn look carries no badge", () => {
  render(<StylistView {...base} status="ok" looks={[look]} />);
  expect(screen.queryByText(/worn today/i)).toBeNull();
});

// The smart-default "why" (legible intelligence): a quiet label above the looks.
test("the predicted occasion's reason is shown above the looks", () => {
  render(<StylistView {...base} status="ok" looks={[look]} reason="Styled for your work day" />);
  expect(screen.getByText("Styled for your work day")).toBeInTheDocument();
});
