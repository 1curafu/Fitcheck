import { render, screen, within } from "@testing-library/react";
import { ProfileHub } from "../profile-hub";

const props = {
  name: "Mykhailo",
  handle: "@icurafu333",
  initials: "M",
  archetype: "Old Money",
  palette: ["#ede6d8", "#2c3a4c"],
  tier: "free" as const,
  stats: { pieces: 24, outfits: 9, streak: 3 },
  links: [
    { href: "/style-dna", label: "Style DNA", desc: "Your archetype, shareable", ready: true },
    { href: "/outfits", label: "Saved Outfits", desc: "Looks you kept", ready: false },
  ],
};

test("identity renders with initials, name and handle", () => {
  render(<ProfileHub {...props} />);
  expect(screen.getByText("M")).toBeInTheDocument();
  expect(screen.getByText("Mykhailo")).toBeInTheDocument();
  expect(screen.getByText("@icurafu333")).toBeInTheDocument();
});

test("the stat trio shows counts with their labels", () => {
  render(<ProfileHub {...props} />);
  const stats = screen.getByTestId("stat-trio");
  expect(within(stats).getByText("24")).toBeInTheDocument();
  expect(within(stats).getByText(/pieces/i)).toBeInTheDocument();
  expect(within(stats).getByText(/streak/i)).toBeInTheDocument();
});

// The closet cap is NOT shown here. Consistent with the reroll meter: a visible
// allowance makes a free user think about the limit constantly, and 50 is far
// enough away that most never approach it.
test("the pieces count does not advertise the free closet cap", () => {
  render(<ProfileHub {...props} />);
  expect(screen.getByTestId("stat-trio")).not.toHaveTextContent(/\/\s*50|of 50/);
});

// `outfits` counts looks WORN, not looks generated. The outfits table holds
// every look the generator ever produced (three per drop, plus styled looks and
// every past day), so counting rows would show a number in the hundreds that
// describes the generator rather than the user.
test("the outfits stat is labelled as what was worn", () => {
  render(<ProfileHub {...props} />);
  expect(screen.getByTestId("stat-trio")).toHaveTextContent(/worn/i);
});

test("the archetype card links through to Style DNA", () => {
  render(<ProfileHub {...props} />);
  expect(screen.getByRole("link", { name: /old money/i })).toHaveAttribute("href", "/style-dna");
});

test("an unbuilt destination is not a link — it says Soon", () => {
  render(<ProfileHub {...props} />);
  expect(screen.queryByRole("link", { name: /saved outfits/i })).not.toBeInTheDocument();
  expect(screen.getByText(/soon/i)).toBeInTheDocument();
});

describe("the Pro card", () => {
  // The price is EUR. The design says £5 and the plan said render it verbatim;
  // that is superseded for the price only — every other price in the app renders
  // in euro, and £5 beside a €3.00 cost-per-wear is a visible inconsistency.
  test("states the price in euro, not the design's pounds", () => {
    render(<ProfileHub {...props} />);
    const card = screen.getByTestId("pro-card");
    expect(card).toHaveTextContent(/€5\/mo/);
    expect(card).not.toHaveTextContent(/£/);
  });

  test("keeps the design's pitch verbatim", () => {
    render(<ProfileHub {...props} />);
    expect(screen.getByTestId("pro-card")).toHaveTextContent(
      /unlimited daily looks, packing mode & cost-per-wear analytics/i,
    );
  });

  // This card is where every gate in the app now sends people, so the one-line
  // pitch is not enough — someone who just hit a wall needs to see what they
  // would actually get.
  test("lists what Pro actually unlocks", () => {
    render(<ProfileHub {...props} />);
    const card = screen.getByTestId("pro-card");
    expect(card).toHaveTextContent(/rerolls/i);
    expect(card).toHaveTextContent(/closet/i);
    expect(card).toHaveTextContent(/around any piece/i);
  });

  test("is inert — billing does not exist yet", () => {
    render(<ProfileHub {...props} />);
    expect(screen.queryByRole("link", { name: /go pro/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /go pro/i })).not.toBeInTheDocument();
  });

  // Selling Pro to someone who already pays is the clearest possible sign that
  // nothing is reading their tier.
  test("a Pro subscriber is not sold the upgrade", () => {
    render(<ProfileHub {...props} tier="pro" />);
    const card = screen.getByTestId("pro-card");
    expect(card).not.toHaveTextContent(/go pro/i);
    expect(card).toHaveTextContent(/active/i);
  });
});
