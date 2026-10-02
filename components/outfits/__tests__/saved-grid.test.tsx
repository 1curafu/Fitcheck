import { render, screen } from "@testing-library/react";
import { SavedGrid, type SavedCard } from "../saved-grid";

const card: SavedCard = { id: "look", lookName: "Quiet camel", occasion: "work", date: "2026-10-01", savedAt: "2026-10-02T12:00:00Z", pieces: [], displayPieces: [] };

test("Free gets an honest counter without an upgrade link below the limit", async () => {
  render(await SavedGrid({ looks: [card], savedCount: 7, limit: 10, more: false }));
  expect(screen.getByText("7 of 10 saved")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Go Pro" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Quiet camel/ })).toHaveAttribute("href", "/outfits/look");
  expect(screen.getByText(/Oct 1/)).toBeInTheDocument();
});

test.each([10, 12])("Free at %s can reach the upgrade, while existing saves remain visible", async count => {
  render(await SavedGrid({ looks: [card], savedCount: count, limit: 10, more: false }));
  expect(screen.getByRole("link", { name: "Go Pro" })).toBeInTheDocument();
  if (count > 10) expect(screen.getByText(/You have 12 saved looks/)).toBeInTheDocument();
  expect(screen.getByText("Quiet camel")).toBeInTheDocument();
});

test("Pro has no allowance counter", async () => {
  render(await SavedGrid({ looks: [card], savedCount: 20, limit: null, more: false }));
  expect(screen.queryByText(/of .* saved/)).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Go Pro" })).not.toBeInTheDocument();
});

test("an empty collection links to today's looks", async () => {
  render(await SavedGrid({ looks: [], savedCount: 0, limit: 10, more: false }));
  expect(screen.getByText("Save a look you like and it stays here.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "See today's looks" })).toHaveAttribute("href", "/generate");
});

test("archived pieces are marked and paging retains the timestamp and ID", async () => {
  render(await SavedGrid({ looks: [{ ...card, pieces: [{ itemId: "piece", slot: "Tops", archived: true }] }], savedCount: 31, limit: null, more: true }));
  expect(screen.getByText("Removed from closet")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Show more" })).toHaveAttribute("href", `/outfits?before=${encodeURIComponent(card.savedAt)}&beforeId=${card.id}`);
});
