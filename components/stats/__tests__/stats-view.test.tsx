import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatsView } from "../stats-view";

const base = {
  value: "€1,240.00",
  totalWears: 47,
  avgCostPerWear: "€26.38",
  mostWorn: [
    { id: "i1", name: "Brushed Oxford", sub: "Worn 12 times" },
    { id: "i2", name: "Wool Trousers", sub: "Worn 9 times" },
  ],
  dust: [
    { id: "i3", name: "Linen Blazer", days: null },
    { id: "i4", name: "Suede Loafers", days: 204 },
  ],
  gap: { label: "A camel overcoat", unlocks: 14, reason: "You have no outerwear for cold days." },
  entitlements: { analytics: true, gapAnalysis: true },
  isPro: true,
};

// Typed from the component, not from `base` — `Partial<typeof base>` infers
// `gap` as non-nullable from the fixture and rejects the `gap: null` case the
// component explicitly supports.
type Props = React.ComponentProps<typeof StatsView>;
const renderStats = (over: Partial<Props> = {}) => render(<StatsView {...base} {...over} />);

test("the headline trio renders value, wears and average", () => {
  renderStats();
  expect(screen.getByText(/closet value/i)).toBeInTheDocument();
  expect(screen.getByText(/total wears/i)).toBeInTheDocument();
  expect(screen.getByText("€1,240.00")).toBeInTheDocument();
  expect(screen.getByText("47")).toBeInTheDocument();
});

test("the gap card states the piece, the unlock count and the reason", () => {
  renderStats();
  expect(screen.getByText(/a camel overcoat/i)).toBeInTheDocument();
  expect(screen.getByText(/unlocks 14 new outfits/i)).toBeInTheDocument();
});

test("no gap card is shown when there is no gap", () => {
  renderStats({ gap: null });
  expect(screen.queryByText(/unlocks/i)).not.toBeInTheDocument();
});

test("there is no shopping CTA — that decision has not been made", () => {
  renderStats();
  expect(screen.queryByText(/curated picks/i)).not.toBeInTheDocument();
});

test("most-worn and idle rows link to their items", () => {
  renderStats();
  expect(screen.getByRole("link", { name: /brushed oxford/i })).toHaveAttribute(
    "href",
    "/closet/i1",
  );
});

test("a never-worn piece says so rather than counting days", () => {
  // `days: null` exists precisely so this line is not "∞ days ago".
  renderStats();
  expect(screen.getByText(/never worn/i)).toBeInTheDocument();
  expect(screen.getByText(/204 days/i)).toBeInTheDocument();
});

test("a closet with no wears explains itself instead of showing zeroes", () => {
  renderStats({ totalWears: 0, avgCostPerWear: null, mostWorn: [], dust: [] });
  expect(screen.getByText(/wear a look/i)).toBeInTheDocument();
});

test("the average is hidden rather than shown as zero when nothing is priced", () => {
  renderStats({ avgCostPerWear: null });
  expect(screen.queryByText(/cost per wear/i)).not.toBeInTheDocument();
});

// --- The Pro line: facts free, analysis Pro (user decision, 2026-08-17) ------

const free = { entitlements: { analytics: false, gapAnalysis: false }, isPro: false };

test("a free user still sees their own headline numbers", () => {
  // The whole argument for this shape: MONETISATION.md sells month three, when
  // the data is theirs. The pitch is made WITH their numbers, not instead of them.
  renderStats(free);
  expect(screen.getByText("€1,240.00")).toBeInTheDocument();
  expect(screen.getByText("47")).toBeInTheDocument();
});

test("a free user does not see the analysis itself", () => {
  renderStats(free);
  expect(screen.queryByText(/brushed oxford/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/linen blazer/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/a camel overcoat/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/unlocks 14/i)).not.toBeInTheDocument();
});

test("the gated sections are still named, so the user knows what is behind them", () => {
  // Not a blank screen: nobody buys a feature they have never reached for.
  renderStats(free);
  expect(screen.getByText(/most worn/i)).toBeInTheDocument();
  expect(screen.getByText(/gathering dust/i)).toBeInTheDocument();
  expect(screen.getByText(/biggest gap/i)).toBeInTheDocument();
});

test("tapping a locked section opens the upgrade sheet, not a dead end", async () => {
  renderStats(free);
  await userEvent.click(screen.getByRole("button", { name: /biggest gap/i }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

test("the two flags gate independently", () => {
  // They exist as separate entitlements; if one always implied the other they
  // would be one flag. Analytics on, gap off is a real state.
  renderStats({ entitlements: { analytics: true, gapAnalysis: false }, isPro: false });
  expect(screen.getByText(/brushed oxford/i)).toBeInTheDocument();
  expect(screen.queryByText(/a camel overcoat/i)).not.toBeInTheDocument();
});
