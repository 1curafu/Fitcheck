import { expect, it } from "vitest";
import { createNavigation } from "next-intl/navigation";
import { routing } from "../routing";

it("leaves external billing destinations unchanged", () => {
  const { getPathname } = createNavigation(routing);
  expect(getPathname({ href: "https://checkout.stripe.com/session", locale: "uk" })).toBe(
    "https://checkout.stripe.com/session",
  );
});
