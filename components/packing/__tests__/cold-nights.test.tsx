// components/packing/__tests__/cold-nights.test.tsx
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/i18n/look-text-request", () => ({ LookTextRequest: () => null }));
vi.mock("@/app/[locale]/packing/actions", () => ({ editCapsule: vi.fn() }));
import { CapsuleView } from "../capsule-view";

const props = { destination: "Zurich", dateRange: "12–15 May", pieces: [], dayCount: 4, outfitCount: 4, why: "", lookText: null,
  tripId: "t", beyondHorizon: false, alternatives: [] };

test("shows the cold-night note when there is one", () => {
  render(<CapsuleView {...props} coldNightNote="Nights drop to 3° — take something warm for the evenings." />);
  expect(screen.getByText(/take something warm/i)).toBeInTheDocument();
});
test("shows nothing extra without it", () => {
  render(<CapsuleView {...props} />);
  expect(screen.queryByText(/take something warm/i)).toBeNull();
});
test("the trip page derives the note from the forecast it already fetched, in the user's unit", () => {
  const page = readFileSync("app/[locale]/packing/[tripId]/page.tsx", "utf8");
  expect(page).toMatch(/coldNights\(forecast\.byDate\)/);
  expect(page).toMatch(/t\("coldNights", \{ temp: formatTemp\(/);
  expect(page).toMatch(/coldNightNote=\{/);
});
