import { render, screen } from "@testing-library/react";
import { MobileNav } from "../mobile-nav";

vi.mock("next/navigation", () => ({ usePathname: () => "/closet" }));

test("renders all four tabs with correct hrefs", () => {
  render(<MobileNav />);
  expect(screen.getByRole("link", { name: /closet/i })).toHaveAttribute("href", "/closet");
  expect(screen.getByRole("link", { name: /stylist/i })).toHaveAttribute("href", "/generate");
  expect(screen.getByRole("link", { name: /diary/i })).toHaveAttribute("href", "/calendar");
  expect(screen.getByRole("link", { name: /profile/i })).toHaveAttribute("href", "/profile");
});

test("marks the active tab with the brand colour", () => {
  render(<MobileNav />);
  expect(screen.getByRole("link", { name: /closet/i })).toHaveClass("text-brand");
  expect(screen.getByRole("link", { name: /stylist/i })).not.toHaveClass("text-brand");
});
