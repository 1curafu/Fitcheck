import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { SharedLinks } from "../shared-links";

const now = new Date("2026-10-01T12:00:00Z");
vi.setSystemTime(now);

test("lists links with their expiry, marks expired ones, and stops a link", async () => {
  const stop = vi.fn(async () => ({ status: "stopped" as const }));
  render(<SharedLinks stop={stop} links={[
    { token: "AAAAAAAAAAAAAAAAAAAAAA", lookName: "Quiet Camel", readyAt: "2026-09-26T10:00:00.000Z", createdAt: "2026-09-26T09:00:00.000Z" },
    { token: "BBBBBBBBBBBBBBBBBBBBBB", lookName: "Old Look", readyAt: "2026-08-20T10:00:00.000Z", createdAt: "2026-08-20T09:00:00.000Z" },
  ]} />);
  const list = screen.getByRole("list", { name: /shared links/i });
  expect(within(list).getByText("Quiet Camel")).toBeInTheDocument();
  expect(within(list).getByText("Quiet Camel").closest("li")).toHaveTextContent(/expires oct 26/i);
  expect(within(list).getByText("Old Look").closest("li")).toHaveTextContent(/expired/i);
  await userEvent.click(within(list).getAllByRole("button", { name: /stop sharing/i })[0]);
  expect(stop).toHaveBeenCalledWith("AAAAAAAAAAAAAAAAAAAAAA");
});

test("says so when nothing is shared", () => {
  render(<SharedLinks stop={vi.fn()} links={[]} />);
  expect(screen.getByText(/no shared links/i)).toBeInTheDocument();
});

test("a claimed link is labeled as stopping rather than still live", () => {
  render(<SharedLinks stop={vi.fn()} links={[{
    token: "AAAAAAAAAAAAAAAAAAAAAA", lookName: "Quiet Camel", readyAt: "2026-09-26T10:00:00.000Z",
    purgingAt: "2026-10-01T10:00:00.000Z", createdAt: "2026-09-26T09:00:00.000Z",
  }]} />);
  expect(screen.getByText(/cleanup pending/i)).toBeInTheDocument();
  expect(screen.queryByText(/expires oct 26/i)).not.toBeInTheDocument();
});
