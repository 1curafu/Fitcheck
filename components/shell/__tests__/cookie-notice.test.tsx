import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CookieNotice } from "../cookie-notice";

beforeEach(() => localStorage.clear());

test("a first-time visitor is told, once", async () => {
  render(<CookieNotice />);
  expect(await screen.findByRole("region", { name: /cookie/i })).toBeInTheDocument();
});

test("it is a notice, not a consent dialog — there is nothing to refuse", async () => {
  // Strictly necessary cookies only, so the honest UI is one acknowledgement.
  render(<CookieNotice />);
  await screen.findByRole("region", { name: /cookie/i });
  expect(screen.getAllByRole("button")).toHaveLength(1);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("it links to the policy", async () => {
  render(<CookieNotice />);
  expect(await screen.findByRole("link", { name: /how we handle your data/i })).toHaveAttribute("href", "/privacy");
});

test("dismissing it is remembered", async () => {
  render(<CookieNotice />);
  await userEvent.click(await screen.findByRole("button", { name: /ok/i }));
  expect(screen.queryByRole("region", { name: /cookie/i })).not.toBeInTheDocument();
  expect(localStorage.getItem("fitcheck:cookie-notice")).toBe("seen");
});

test("a visitor who already dismissed it is not nagged", () => {
  localStorage.setItem("fitcheck:cookie-notice", "seen");
  render(<CookieNotice />);
  expect(screen.queryByRole("region", { name: /cookie/i })).not.toBeInTheDocument();
});
