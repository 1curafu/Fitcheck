import { render } from "@testing-library/react";

const nav = vi.hoisted(() => ({ path: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path, useRouter: () => ({ push: vi.fn() }) }));

import { ShellFrame, isWidePath } from "../shell-frame";

test("only the landing is wide; every other page keeps the 440px phone column", () => {
  expect(isWidePath("/")).toBe(true);
  for (const p of ["/sign-in", "/closet", "/privacy", "/onboarding"]) expect(isWidePath(p)).toBe(false);
});

test("the frame follows the CURRENT path, so a landing kept alive by Activity cannot widen other pages", () => {
  nav.path = "/";
  const { container, rerender } = render(<ShellFrame><p /></ShellFrame>);
  expect(container.firstElementChild).toHaveClass("max-w-none");
  nav.path = "/sign-in";
  rerender(<ShellFrame><p /></ShellFrame>);
  expect(container.firstElementChild).toHaveClass("max-w-[440px]");
});
