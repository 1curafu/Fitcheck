import { render, screen } from "@testing-library/react";
import { StyleDnaView } from "../style-dna-view";
import type { StyleDna } from "@/lib/style-dna";

vi.mock("../share-dna", () => ({ ShareDna: () => <button type="button">Share</button> }));

const base: StyleDna = {
  reading: { source: "closet", archetype: "Preppy" }, quizArchetype: "Old Money",
  mix: { garments: 20, marked: 12, shares: { "Old Money": 0.25, Preppy: 0.6, Streetwear: 0.15 } },
  swatches: [{ color: "navy", hex: "#2c3a4c" }, { color: "camel", hex: "#b89a6a" }],
  trio: { pieces: 20, looksWorn: 12, occasion: { key: "everyday", share: 0.62 }, colours: 6 },
  blurb: { opening: "preppy", trait: "tonalTailored" },
  tendencies: { cut: { value: 0.7, level: "tailored" }, tonal: { value: 0.85, level: "strong" }, pattern: { value: 0.1, level: "minimal" }, heritage: { value: 0.5, level: "high" } },
  quiz: { palette: { answer: "Neutrals", share: 0.84 }, fit: null },
  fabric: { top: ["Wool", "Cotton", "Linen"], natural: 0.9, level: "natural" },
  formula: { status: "found", kinds: ["knit", "chinos", "loafers"], wears: 4 },
  pairing: { status: "found", colors: ["camel", "navy"], wears: 5, verdict: "classic" },
  dressy: { status: "found", owned: 3.4, worn: 2.8, verdict: "ownDressier" },
  signature: { status: "found", pieces: [{ id: "i1", wears: 6 }] },
};
const pieces = [{ id: "i1", name: "Navy Cable Knit", wears: 6, imageUrl: null }];

test("the card shows what the closet reads, the quiz answer and the template blurb", () => {
  render(<StyleDnaView dna={base} signaturePieces={pieces} isPro />);
  expect(screen.getByRole("heading", { name: "Preppy" })).toBeInTheDocument();
  expect(screen.getByText("You said Old Money")).toBeInTheDocument();
  expect(screen.getByText("Collegiate roots, kept crisp. You lean tonal and favor a tailored cut.")).toBeInTheDocument();
  expect(screen.getByText("62%")).toBeInTheDocument();
  expect(screen.getByText("20 pieces analyzed")).toBeInTheDocument();
});

test("every section from points 1–8 renders with real values", () => {
  render(<StyleDnaView dna={base} signaturePieces={pieces} isPro={false} />);
  expect(screen.getByText("From 12 of your 20 pieces with a clear style signal")).toBeInTheDocument();
  expect(screen.getByText("You said Quiet Neutrals: 84% of your closet agrees")).toBeInTheDocument();
  expect(screen.getByText("Knit + Chinos + Loafers")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /navy cable knit/i })).toHaveAttribute("href", "/closet/i1");
  expect(screen.getByText("A classic pairing")).toBeInTheDocument();
  expect(screen.getByText("Mostly natural fibers")).toBeInTheDocument();
  expect(screen.getByText("You own dressier than you wear")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /complete your dna/i })).toHaveAttribute("href", "/stats");
  expect(screen.getByText("Pro")).toBeInTheDocument();
});

test("a new user sees the quiz answer, the note and locked sections — never a 0% claim", () => {
  const fresh: StyleDna = {
    ...base, reading: { source: "quiz", archetype: "Old Money" }, quizArchetype: "Old Money",
    mix: { garments: 3, marked: 0, shares: { "Old Money": 0, Preppy: 0, Streetwear: 0 } },
    trio: { pieces: 3, looksWorn: 0, occasion: null, colours: 2 }, quiz: { palette: null, fit: null }, fabric: null,
    tendencies: { cut: null, tonal: { value: 1, level: "strong" }, pattern: { value: 0, level: "minimal" }, heritage: { value: 0, level: "low" } },
    formula: { status: "locked", have: 0, need: 5 }, pairing: { status: "locked", have: 0, need: 5 },
    dressy: { status: "locked", have: 0, need: 5 }, signature: { status: "locked", have: 0, need: 5 },
  };
  render(<StyleDnaView dna={fresh} signaturePieces={[]} isPro />);
  expect(screen.getByRole("heading", { name: "Old Money" })).toBeInTheDocument();
  expect(screen.getByText(/add a few more pieces/i)).toBeInTheDocument();
  expect(screen.queryByText(/style mix/i)).not.toBeInTheDocument();
  expect(screen.getAllByText("Wear 5 looks to unlock (0/5)").length).toBeGreaterThanOrEqual(3);
  expect(screen.getByText("Colors")).toBeInTheDocument();
  expect(screen.queryByText("Pro")).not.toBeInTheDocument();
});

test("when the closet agrees with the quiz it says so instead of repeating the answer", () => {
  render(<StyleDnaView dna={{ ...base, quizArchetype: "Preppy" }} signaturePieces={pieces} isPro />);
  expect(screen.getByText("Your closet agrees")).toBeInTheDocument();
  expect(screen.queryByText("You said Preppy")).not.toBeInTheDocument();
});

test("the page links on to the style editor, so changing an answer is one tap from the card", () => {
  render(<StyleDnaView dna={base} signaturePieces={pieces} isPro />);
  expect(screen.getByRole("link", { name: /your style answers/i })).toHaveAttribute("href", "/settings/style");
});

test("the style mix needs the same evidence as the headline: one marked piece is not a mix", () => {
  const thin: StyleDna = {
    ...base, reading: { source: "quiz", archetype: "Old Money" },
    mix: { garments: 7, marked: 1, shares: { "Old Money": 0, Preppy: 1, Streetwear: 0 } },
  };
  render(<StyleDnaView dna={thin} signaturePieces={[]} isPro />);
  expect(screen.queryByText(/style mix/i)).not.toBeInTheDocument();
});

test("historical vocabulary the catalogue no longer knows is shown as stored, not as a missing key", () => {
  const legacy: StyleDna = {
    ...base,
    trio: { ...base.trio, occasion: { key: "travel", share: 0.5 } },
    fabric: { top: ["Wool", "Bamboo"], natural: 0.9, level: "natural" },
  };
  render(<StyleDnaView dna={legacy} signaturePieces={pieces} isPro />);
  expect(screen.getByText("travel")).toBeInTheDocument();
  expect(screen.getByText("Wool · Bamboo")).toBeInTheDocument();
});
