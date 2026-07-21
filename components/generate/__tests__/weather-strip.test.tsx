import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeatherStrip } from "../weather-strip";
import type { WeatherPayload } from "@/lib/generator/types";

const weather: WeatherPayload = {
  tempC: 14,
  feelsLikeC: 12,
  condition: "Overcast",
  cityLabel: "Berlin",
  timezone: "Europe/Berlin",
  laterSentence: "Rain from 21:00 — take a shell.",
  adviceClause: "take a shell.",
  laterLabel: "Later",
  hourly: [
    { hh: "18:00", tempC: 14, rain: false, isNow: true },
    { hh: "19:00", tempC: 13, rain: false, isNow: false },
    { hh: "20:00", tempC: 12, rain: false, isNow: false },
    { hh: "21:00", tempC: 11, rain: true, isNow: false },
  ],
};

test("renders temp, city, and the later sentence", () => {
  render(<WeatherStrip weather={weather} />);
  expect(screen.getByText("14°")).toBeInTheDocument();
  expect(screen.getByText("Berlin")).toBeInTheDocument();
  expect(screen.getByText("take a shell.")).toBeInTheDocument();
});

test("the advice clause is the rust element (binds to adviceClause, not a re-split)", () => {
  render(<WeatherStrip weather={weather} />);
  expect(screen.getByText("take a shell.")).toHaveClass("text-brand-high", "font-semibold");
});

test("Later toggles the hourly strip (4 cells), marking now + rain", async () => {
  render(<WeatherStrip weather={weather} />);
  expect(screen.queryByTestId("hourly")).toBeNull();
  await userEvent.click(screen.getByTestId("later-toggle"));
  const hourly = screen.getByTestId("hourly");
  expect(within(hourly).getAllByText(/°$/)).toHaveLength(4);
  expect(within(hourly).getByText("Now")).toBeInTheDocument();
  expect(hourly.querySelector('[data-rain="true"]')).toHaveClass("text-brand-high");
});

test("the city menu offers 'Use my location' above the search input", async () => {
  const onUseMyLocation = vi.fn();
  render(<WeatherStrip weather={weather} onUseMyLocation={onUseMyLocation} />);
  await userEvent.click(screen.getByRole("button", { name: "Berlin" }));

  const listbox = screen.getByRole("listbox");
  await userEvent.click(within(listbox).getByRole("button", { name: /use my location/i }));

  expect(onUseMyLocation).toHaveBeenCalledTimes(1);
  // the menu closes on tap, exactly as picking a city does
  expect(screen.queryByRole("listbox")).toBeNull();
});

test("while locating, the strip shows a status line (not a blocked UI)", () => {
  render(<WeatherStrip weather={weather} locating onUseMyLocation={vi.fn()} />);
  expect(screen.getByRole("status")).toHaveTextContent(/locating/i);
  // weather stays rendered throughout — location never blocks the looks
  expect(screen.getByText("14°")).toBeInTheDocument();
});

test("a geolocation failure renders in the strip and points at the search fallback", () => {
  render(
    <WeatherStrip
      weather={weather}
      geoError="Location access is off — search for a city instead."
      onUseMyLocation={vi.fn()}
    />,
  );
  const status = screen.getByRole("status");
  expect(status).toHaveTextContent(/search for a city instead/i);
  expect(status).toHaveClass("text-muted-foreground"); // D2 contrast floor
});

test("no onUseMyLocation handler → no row (server-rendered / unsupported browser)", async () => {
  render(<WeatherStrip weather={weather} />);
  await userEvent.click(screen.getByRole("button", { name: "Berlin" }));
  expect(within(screen.getByRole("listbox")).queryByRole("button", { name: /use my location/i })).toBeNull();
});

test("city menu opens, selecting a city calls onCityChange and closes", async () => {
  const onCityChange = vi.fn();
  render(
    <WeatherStrip
      weather={weather}
      cities={[{ name: "London", country: "UK", lat: 51.5, lon: -0.1 }]}
      onCityChange={onCityChange}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Berlin" }));
  const listbox = screen.getByRole("listbox");
  await userEvent.click(within(listbox).getByRole("option", { name: /London/ }));
  expect(onCityChange).toHaveBeenCalledWith(expect.objectContaining({ name: "London" }));
  expect(screen.queryByRole("listbox")).toBeNull();
});
