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
