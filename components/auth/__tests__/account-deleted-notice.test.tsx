import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { AccountDeletedNotice } from "../account-deleted-notice";

test("the signed-out landing notice confirms deletion once and removes the query from history", () => {
  const replaceState = vi.spyOn(window.history, "replaceState");
  render(<AccountDeletedNotice />);

  expect(screen.getByText("Your account and live data have been deleted.")).toBeInTheDocument();
  expect(replaceState).toHaveBeenCalledOnce();
  expect(replaceState).toHaveBeenCalledWith({}, "", "/");
  replaceState.mockRestore();
});
