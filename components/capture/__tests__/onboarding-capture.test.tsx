import { render, screen } from "@testing-library/react";
import { OnboardingCapture } from "../onboarding-capture";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/images/process", () => ({
  processImage: vi.fn(),
  blobToBase64: vi.fn(),
}));
vi.mock("@/app/closet/upload/actions", () => ({
  uploadAndTag: vi.fn(),
  confirmItem: vi.fn(),
}));

test("footer reads 'Skip for now' with no items", () => {
  render(<OnboardingCapture initialCount={0} />);
  expect(screen.getByRole("button", { name: "Skip for now" })).toBeInTheDocument();
  expect(screen.getByText("Capture your first five.")).toBeInTheDocument();
});

test("footer reads 'Enter your closet' once an item exists", () => {
  render(<OnboardingCapture initialCount={1} />);
  expect(screen.getByRole("button", { name: "Enter your closet" })).toBeInTheDocument();
});
