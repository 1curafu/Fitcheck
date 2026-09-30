import { render } from "@testing-library/react";

const nav = vi.hoisted(() => ({ path: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path, useRouter: () => ({ push: vi.fn() }) }));

import { WideFlag, isWidePath } from "../wide-flag";

test("only the landing is wide; every other page keeps the 440px phone column", () => {
  expect(isWidePath("/")).toBe(true);
  for (const p of ["/sign-in", "/closet", "/privacy", "/onboarding", "/l/abc"]) expect(isWidePath(p)).toBe(false);
});

test("the override follows the CURRENT path, so a landing kept alive by Activity cannot widen other pages", () => {
  nav.path = "/";
  const { container, rerender } = render(<WideFlag />);
  expect(container.querySelector("style")?.textContent).toBe(":root{--shell-max:none}");
  nav.path = "/sign-in";
  rerender(<WideFlag />);
  expect(container.querySelector("style")).toBeNull();
});
