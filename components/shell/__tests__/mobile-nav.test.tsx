import { render, screen } from "@testing-library/react";
import { MobileNav } from "../mobile-nav";
import { MobileShell } from "../mobile-shell";

vi.mock("next/navigation", () => ({ usePathname: () => "/closet" }));

test("renders all four tabs with correct hrefs", () => {
  render(<MobileNav />);
  expect(screen.getByRole("link", { name: /closet/i })).toHaveAttribute("href", "/closet");
  expect(screen.getByRole("link", { name: /stylist/i })).toHaveAttribute("href", "/generate");
  expect(screen.getByRole("link", { name: /diary/i })).toHaveAttribute("href", "/calendar");
  expect(screen.getByRole("link", { name: /profile/i })).toHaveAttribute("href", "/profile");
});

// Design :1145 — `tabActive='#EDE6D8'` (--foreground) with weight 600,
// `tabIdle='#5b5950'`. The active tab was rust, which is both off-design and a
// second rust element on screens that already spend theirs (the capture FAB,
// the "f" glyph in the why-quote). See DESIGN.md, the One Rust Rule.
test("the active tab is the cream foreground at weight 600, not rust", () => {
  render(<MobileNav />);
  const active = screen.getByRole("link", { name: /closet/i });
  expect(active).toHaveClass("text-foreground", "font-semibold");
  expect(active).not.toHaveClass("text-brand");
});

test("inactive tabs recede", () => {
  render(<MobileNav />);
  const idle = screen.getByRole("link", { name: /stylist/i });
  expect(idle).toHaveClass("text-muted-dim");
  expect(idle).not.toHaveClass("text-foreground");
});

test("the nav is a floating pill, not a full-width bar", () => {
  const { container } = render(<MobileNav />);
  const nav = container.querySelector("nav")!;
  // Design :825-826 — the outer element is a transparent gradient fade; the
  // pill is the inner slab. A top border means we reverted to the flat bar.
  expect(nav.className).not.toMatch(/border-t/);
  const pill = nav.querySelector("div");
  expect(pill?.className).toMatch(/rounded-\[22px\]/);
  expect(pill?.className).toMatch(/backdrop-blur/);
});

// The nav is sticky, but an ancestor with `overflow: hidden` is a scroll
// container — a sticky descendant then sticks to THAT box instead of the
// viewport, and the nav only appeared once you scrolled to the end of the page.
// `overflow-x-clip` clips the 440px cap without creating a scroll container.
test("the shell does not trap the sticky nav in a scroll container", () => {
  const { container } = render(<MobileShell>content</MobileShell>);
  const shell = container.firstElementChild as HTMLElement;
  expect(shell.className).not.toMatch(/(?<!-x-)\boverflow-hidden\b/);
  expect(shell.className).toContain("overflow-x-clip");
});
