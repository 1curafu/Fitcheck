import { act, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { OutfitText, TranslationResult } from "@/lib/outfits/text";
import uk from "@/messages/uk.json";
const mock = vi.hoisted(() => ({ request: null as null | { sources: unknown[]; onReady: (result: TranslationResult) => void } }));
vi.mock("@/components/i18n/look-text-request", () => ({ LookTextRequest: (props: typeof mock.request) => { mock.request = props; return null; } }));
import { DayList, type DayCard } from "../day-list";
import { LookWhy } from "../look-why";
const source = { id: "00000000-0000-4000-8000-000000000001", sourceLocale: "en-US" as const, name: "Day 1", why: "Original why" };
const text: OutfitText = { id: source.id, locale: "uk", name: source.name, why: source.why, translated: false, source };
const translation: OutfitText = { ...text, name: "День 1", why: "Обраний образ", translated: true };
const day: DayCard = { outfitId: source.id, date: "2026-09-28", label: "28", occasion: "everyday", tempC: 20, rain: false,
  text, pieces: [{ id: "piece", name: "My cream knit", imageUrl: "", wear: 2 }] };
beforeEach(() => { (globalThis as { __intl?: { locale: string; messages: object } }).__intl = { locale: "uk", messages: uk }; mock.request = null; });
it("trip-day translation preserves piece names, wear count and outfit navigation", () => {
  render(<DayList destination="Zurich" dateRange="28 Sep" days={[day]} unit="C" backHref="/packing/trip" />);
  expect(screen.getByText("Original why")).toBeVisible();
  act(() => mock.request!.onReady({ locale: "uk", texts: [translation], busyIds: [] }));
  expect(screen.getByText("День 1")).toBeVisible();
  expect(screen.getByText("Обраний образ")).toBeVisible();
  expect(screen.getByText(/My cream knit/)).toHaveTextContent("2");
  expect(screen.getByRole("link", { name: /День 1/ })).toHaveAttribute("href", `/outfits/${source.id}`);
});
it("a trip edit replaces the source and rejects a pending result for the old row", () => {
  const view = render(<DayList destination="Zurich" dateRange="28 Sep" days={[day]} unit="C" backHref="/packing/trip" />);
  const late = mock.request!.onReady;
  const nextSource = { ...source, id: "00000000-0000-4000-8000-000000000002", name: "Rebuilt day" };
  view.rerender(<DayList destination="Zurich" dateRange="28 Sep" days={[{ ...day, outfitId: nextSource.id,
    text: { ...text, id: nextSource.id, name: nextSource.name, source: nextSource } }]} unit="C" backHref="/packing/trip" />);
  act(() => late({ locale: "uk", texts: [translation], busyIds: [] }));
  expect(screen.getByText("Rebuilt day")).toBeVisible();
  expect(screen.queryByText("День 1")).not.toBeInTheDocument();
});
it("capsule and partial-trip reasoning request only their displayed first look", () => {
  render(<LookWhy name="Capsule" text={text} fallbackWhy="Fallback" />);
  expect(mock.request!.sources).toEqual([source]);
  act(() => mock.request!.onReady({ locale: "uk", texts: [translation], busyIds: [] }));
  expect(screen.getByText("Обраний образ")).toBeVisible();
  expect(mock.request!.sources).toEqual([]);
});
it("a capsule without a saved look uses its localized fallback without a request", () => {
  render(<LookWhy name="Capsule" text={null} fallbackWhy="Локалізований запасний текст" />);
  expect(screen.getByText("Локалізований запасний текст")).toBeVisible();
  expect(mock.request!.sources).toEqual([]);
});
it("a saved look with no displayed reasoning does not translate a hidden title", () => {
  render(<LookWhy name="Capsule" text={{ ...text, why: null, source: { ...source, why: null } }} fallbackWhy="Fallback" />);
  expect(screen.getByText("Fallback")).toBeVisible();
  expect(mock.request!.sources).toEqual([]);
});
