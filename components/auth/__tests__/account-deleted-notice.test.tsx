import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { AccountDeletedNotice } from "../account-deleted-notice";

test("the notice confirms deletion once and strips the query without leaving the page", () => {
  window.history.pushState({}, "", "/sign-in?account=deleted");
  const replaceState = vi.spyOn(window.history, "replaceState");
  render(<AccountDeletedNotice />);

  expect(screen.getByText("Your account and live data have been deleted.")).toBeInTheDocument();
  expect(replaceState).toHaveBeenCalledOnce();
  expect(replaceState).toHaveBeenCalledWith({}, "", "/sign-in");
  replaceState.mockRestore();
});
