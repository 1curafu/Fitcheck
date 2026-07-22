import { render, screen } from "@testing-library/react";
import { ItemCard } from "../item-card";

// The closet grid is the one screen that renders many images at once, and it
// deliberately does NOT use next/image: every URL is a short-lived Supabase
// signature (lib/storage/signed.ts), so the optimizer's URL-keyed cache would
// miss on every load and bill a transformation per view. The two wins that do
// NOT need the optimizer we take by hand.

test("a grid image defers loading until it is near the viewport", () => {
  render(<ItemCard id="i1" name="Camel knit" imageUrl="https://example.test/a.png" height={200} />);
  const img = screen.getByAltText("Camel knit");
  expect(img).toHaveAttribute("loading", "lazy");
  expect(img).toHaveAttribute("decoding", "async");
});

test("the card reserves its height before the image loads, so the grid never shifts", () => {
  render(<ItemCard id="i1" name="Camel knit" imageUrl="https://example.test/a.png" height={200} />);
  expect(screen.getByAltText("Camel knit").parentElement).toHaveStyle({ height: "200px" });
});
