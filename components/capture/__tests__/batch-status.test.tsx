import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BatchStatus } from "../batch-status";
import type { BatchView } from "../use-capture";

const active: BatchView = {
  total: 10, currentIndex: 0, currentStage: "reviewing", nextReady: true,
  capacityMessage: "This closet has room for 3 more pieces.", stopped: false,
  summary: { total: 10, saved: 0, skipped: 0, unprocessed: 10 },
};

const handlers = {
  onRetry: vi.fn(), onSkip: vi.fn(), onFinish: vi.fn(), onEnterCloset: vi.fn(),
};

test("shows quiet progress, next readiness, and capacity information", () => {
  render(<BatchStatus batch={active} saving={false} error={null} {...handlers} />);
  expect(screen.getByText("Photo 1 of 10")).toBeInTheDocument();
  expect(screen.getByText("Next photo ready")).toBeInTheDocument();
  expect(screen.getByText(/room for 3 more pieces/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Finish batch" })).toBeEnabled();
});

test("a failed photo offers Retry and Skip without advancing it", async () => {
  handlers.onRetry.mockClear();
  handlers.onSkip.mockClear();
  render(<BatchStatus batch={{ ...active, currentStage: "failed" }} saving={false}
    error="Cutout failed" {...handlers} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Cutout failed");
  await userEvent.click(screen.getByRole("button", { name: "Retry photo" }));
  await userEvent.click(screen.getByRole("button", { name: "Skip photo" }));
  expect(handlers.onRetry).toHaveBeenCalledOnce();
  expect(handlers.onSkip).toHaveBeenCalledOnce();
});

test("Finish is disabled during saving and summary enters the closet", async () => {
  handlers.onEnterCloset.mockClear();
  const { rerender } = render(<BatchStatus batch={active} saving error={null} {...handlers} />);
  expect(screen.getByRole("button", { name: "Finish batch" })).toBeDisabled();
  rerender(<BatchStatus batch={{ ...active, stopped: true,
    summary: { total: 10, saved: 2, skipped: 1, unprocessed: 7 } }}
    saving={false} error={null} {...handlers} />);
  expect(screen.getByText(/2 saved/)).toBeInTheDocument();
  expect(screen.getByText(/1 skipped/)).toBeInTheDocument();
  expect(screen.getByText(/7 unprocessed/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Enter closet" }));
  expect(handlers.onEnterCloset).toHaveBeenCalledOnce();
});

test("a full closet explains why every selected photo remained unprocessed", () => {
  render(<BatchStatus batch={{ ...active, stopped: true,
    capacityMessage: "Your closet is full.",
    summary: { total: 10, saved: 0, skipped: 0, unprocessed: 10 } }}
    saving={false} error={null} {...handlers} />);
  expect(screen.getByText("Your closet is full.")).toBeInTheDocument();
  expect(screen.getByText(/10 unprocessed/)).toBeInTheDocument();
});

test("the final photo does not claim another is being prepared", () => {
  render(<BatchStatus batch={{ ...active, currentIndex: 9, nextReady: false }}
    saving={false} error={null} {...handlers} />);
  expect(screen.getByText("Last photo")).toBeInTheDocument();
  expect(screen.queryByText("Preparing next photo")).not.toBeInTheDocument();
});
