import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileHub } from "../profile-hub";
// The upgrade sheet imports the billing Server Actions (server-only); a rendering test never calls Stripe.
vi.mock("@/app/billing/actions", () => ({ startCheckout: vi.fn(), openBillingPortal: vi.fn() }));

const props = {
  name: "Mykhailo",
  handle: "@icurafu333",
  initials: "M",
  archetype: "Old Money",
  palette: ["#ede6d8", "#2c3a4c"],
  tier: "free" as const,
  stats: { pieces: 24, outfits: 9, streak: 3 },
  links: [
    {
      href: "/style-dna",
      label: "Style DNA",
      desc: "Your archetype, shareable",
      icon: "dna" as const,
      ready: true,
    },
    {
      href: "/outfits",
      label: "Saved Outfits",
      desc: "Looks you kept",
      icon: "saved" as const,
      ready: false,
    },
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
  // A TEASER, not a brochure. The first version printed all seven benefits into
  // the rust card and read as a wall of bullets; the card invites the tap and
  // the sheet makes the case.
  test("is a compact hook, not the full feature list", () => {
    render(<ProfileHub {...props} />);
    const card = screen.getByRole("button", { name: /fitcheck pro/i });
    expect(card).toHaveTextContent(/whole wardrobe/i);
    expect(card).not.toHaveTextContent(/gap analysis/i);
  });

  // The mockup puts the price pill inside the banner (Fitcheck.dc.html:697).
  test("carries the price pill, as the mockup does", () => {
    render(<ProfileHub {...props} />);
    // The price follows the device's time zone (CHF/€/$); the test must pass in any zone, CI runs in UTC.
    expect(screen.getByRole("button", { name: /fitcheck pro/i })).toHaveTextContent(
      /go pro · (CHF 5|€5|\$5) \/ month/i,
    );
  });

  test("tapping it opens the pitch with the price", async () => {
    render(<ProfileHub {...props} />);
    await userEvent.click(screen.getByRole("button", { name: /fitcheck pro/i }));
    const sheet = await screen.findByRole("dialog");
    expect(sheet).toHaveTextContent(/gap analysis/i);
    expect(sheet).toHaveTextContent(/around any piece/i);
    // The price is shown in the buyer's currency (CHF/€/$ by time zone). The design's £5 stays superseded.
    expect(sheet).toHaveTextContent(/(CHF 5|€5|\$5) \/ month/);
    expect(sheet).not.toHaveTextContent(/£/);
  });

  // Scoped to the sheet: the CARD's own accessible name contains "Go Pro ·
  // €5/mo" because the mockup puts the price pill inside it, so an unscoped
  // query matches the card and passes for the wrong reason.
  test("the pitch is inert — billing does not exist yet", async () => {
    render(<ProfileHub {...props} />);
    await userEvent.click(screen.getByRole("button", { name: /fitcheck pro/i }));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).queryByRole("link", { name: /go pro/i })).not.toBeInTheDocument();
    expect(within(sheet).queryByRole("button", { name: /go pro/i })).not.toBeInTheDocument();
  });

  // Selling Pro to someone who already pays is the clearest possible sign that
  // nothing is reading their tier.
  test("a Pro subscriber is not sold the upgrade", async () => {
    render(<ProfileHub {...props} tier="pro" />);
    const card = screen.getByRole("button", { name: /fitcheck pro/i });
    expect(card).toHaveTextContent(/active/i);
    expect(card).not.toHaveTextContent(/go pro/i);
    await userEvent.click(card);
    const sheet = await screen.findByRole("dialog");
    expect(sheet).not.toHaveTextContent(/\/ month/);
    expect(sheet).toHaveTextContent(/gap analysis/i);
  });

  // Stripe's "limit customers to 1 subscription" sends an existing subscriber to /profile — the button must be here.
  test("a Pro subscriber can manage the subscription from the hub", () => {
    render(
      <ProfileHub
        {...props}
        tier="pro"
        subscription={{ status: "active", interval: "year", currentPeriodEnd: "2026-10-12T08:00:00.000Z", cancelAtPeriodEnd: false }}
      />,
    );
    expect(screen.getByRole("button", { name: /manage subscription/i })).toBeInTheDocument();
    expect(screen.getByText(/annual/i)).toBeInTheDocument();
  });

  test("a free user is not shown a manage button", () => {
    render(<ProfileHub {...props} />);
    expect(screen.queryByRole("button", { name: /manage subscription/i })).not.toBeInTheDocument();
  });

  test("back from checkout: welcome once Pro, 'activating' until the webhook lands", () => {
    const { unmount } = render(<ProfileHub {...props} tier="pro" proNotice="welcome" />);
    expect(screen.getByRole("status")).toHaveTextContent(/welcome to pro/i);
    unmount();
    render(<ProfileHub {...props} proNotice="welcome" />);
    expect(screen.getByRole("status")).toHaveTextContent(/activating pro/i);
  });
});

test("the policies are reachable from the hub, not only from Settings", () => {
  // A signed-in user never sees the sign-in screen again; this is the screen
  // they come to for everything about their account.
  render(<ProfileHub {...props} />);
  expect(screen.getByRole("link", { name: /privacy policy/i })).toHaveAttribute("href", "/privacy");
  expect(screen.getByRole("link", { name: /terms of service/i })).toHaveAttribute("href", "/terms");
});
