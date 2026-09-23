import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const {
  createClient,
  deleteLiveAccount,
  captureException,
  flush,
  redirect,
  getUser,
  signOut,
} = vi.hoisted(() => ({
  createClient: vi.fn(),
  deleteLiveAccount: vi.fn(),
  captureException: vi.fn(),
  flush: vi.fn(),
  redirect: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/account-deletion/runtime", () => ({ deleteLiveAccount }));
vi.mock("@sentry/nextjs", () => ({ captureException, flush }));
vi.mock("next/navigation", () => ({
  RedirectType: { replace: "replace" },
  redirect,
}));

import { deleteAccount, type DeleteAccountState } from "../actions";
import { DeletionFailure } from "@/lib/account-deletion/types";

const USER_ID = "715ed5db-f090-4b8c-a067-640ecee36aa0";
const EMAIL = "person@example.com";
const REDIRECT = new Error("NEXT_REDIRECT");
const SESSION_EXPIRED = "Your session has expired. Sign in and try again.";
const CONFIRMATION_ERROR = "Type your account email exactly to continue.";

function confirmationForm(value?: FormDataEntryValue) {
  const formData = new FormData();
  if (value !== undefined) formData.set("confirmation", value);
  return formData;
}

function errorState(message: string): DeleteAccountState {
  return { status: "error", message };
}

describe("deleteAccount", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createClient.mockResolvedValue({ auth: { getUser, signOut } });
    getUser.mockResolvedValue({ data: { user: { id: USER_ID, email: EMAIL } }, error: null });
    deleteLiveAccount.mockResolvedValue(undefined);
    signOut.mockResolvedValue({ error: null });
    redirect.mockImplementation(() => {
      throw REDIRECT;
    });
  });

  afterEach(() => vi.useRealTimers());

  test("rejects an expired session before invoking irreversible deletion", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(deleteAccount({ status: "idle" }, confirmationForm(EMAIL))).resolves.toEqual(errorState(SESSION_EXPIRED));

    expect(deleteLiveAccount).not.toHaveBeenCalled();
  });

  test("fails closed when the authenticated user has no email", async () => {
    getUser.mockResolvedValue({ data: { user: { id: USER_ID, email: null } }, error: null });

    await expect(deleteAccount({ status: "idle" }, confirmationForm(EMAIL))).resolves.toEqual(errorState(SESSION_EXPIRED));

    expect(deleteLiveAccount).not.toHaveBeenCalled();
  });

  test.each([
    ["missing", undefined],
    ["a file", new File(["confirmation"], "confirmation.txt")],
    ["an over-320-character value", "a".repeat(321)],
  ])("rejects %s confirmation input", async (_label, confirmation) => {
    await expect(deleteAccount({ status: "idle" }, confirmationForm(confirmation))).resolves.toEqual(
      errorState(CONFIRMATION_ERROR),
    );

    expect(deleteLiveAccount).not.toHaveBeenCalled();
  });

  test("requires the raw confirmation to exactly match the server-returned email", async () => {
    await expect(deleteAccount({ status: "idle" }, confirmationForm(` ${EMAIL}`))).resolves.toEqual(
      errorState(CONFIRMATION_ERROR),
    );

    expect(deleteLiveAccount).not.toHaveBeenCalled();
  });

  test("passes only the server user id and a request timestamp to the deletion runtime", async () => {
    const formData = confirmationForm(EMAIL);
    formData.set("userId", "attacker-controlled-id");

    await expect(deleteAccount({ status: "idle" }, formData)).rejects.toBe(REDIRECT);

    expect(deleteLiveAccount).toHaveBeenCalledWith(USER_ID, expect.any(Date));
  });

  test("captures only sanitized stage and correlation metadata for a deletion failure", async () => {
    const b2Response = `B2 rejected ${USER_ID} ${EMAIL} at deletion-ledger/v1/private.json`;
    const confirmation = EMAIL;
    const failure = new DeletionFailure("ledger");
    failure.message = b2Response;
    deleteLiveAccount.mockRejectedValue(failure);

    await expect(deleteAccount({ status: "idle" }, confirmationForm(confirmation))).resolves.toEqual(
      errorState("We couldn't delete your account. Please try again or contact support."),
    );

    expect(captureException).toHaveBeenCalledTimes(1);
    const [captured, context] = captureException.mock.calls[0] as [Error, { tags: Record<string, string>; extra?: unknown }];
    expect(captured).toEqual(new Error("Account deletion failed"));
    expect(context).toEqual({
      tags: {
        account_deletion_stage: "ledger",
        account_deletion_reason: "unclassified",
        account_deletion_correlation_id: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        ),
      },
    });
    const reported = JSON.stringify({ message: captured.message, extras: context.extra, tags: context.tags });
    expect(reported).not.toContain(EMAIL);
    expect(reported).not.toContain(USER_ID);
    expect(reported).not.toContain(confirmation);
    expect(reported).not.toContain(b2Response);
    expect(reported).not.toContain("deletion-ledger/v1/private.json");
  });

  test("logs the failed stage and sanitized reason, and flushes Sentry before answering", async () => {
    const failure = new DeletionFailure("ledger", "B2 key scope rejected");
    deleteLiveAccount.mockRejectedValue(failure);
    const order: string[] = [];
    captureException.mockImplementation(() => void order.push("capture"));
    flush.mockImplementation(async () => {
      order.push("flush");
      return true;
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      await deleteAccount({ status: "idle" }, confirmationForm(EMAIL));

      expect(order).toEqual(["capture", "flush"]);
      expect(log).toHaveBeenCalledTimes(1);
      const line = String(log.mock.calls[0]?.[0]);
      expect(line).toMatch(/^\[account-deletion\] failed stage=ledger reason="B2 key scope rejected" correlation=[0-9a-f-]{36}$/);
      expect(line).not.toContain(EMAIL);
      expect(line).not.toContain(USER_ID);
      const [, context] = captureException.mock.calls[0] as [Error, { tags: Record<string, string> }];
      expect(context.tags.account_deletion_reason).toBe("B2 key scope rejected");
      expect(line).toContain(context.tags.account_deletion_correlation_id);
    } finally {
      log.mockRestore();
    }
  });

  test("treats a residual Storage failure as a completed deletion that still alerts", async () => {
    const failure = new DeletionFailure("residual-storage");
    failure.message = `storage rejected ${USER_ID} ${EMAIL}`;
    deleteLiveAccount.mockRejectedValue(failure);

    await expect(deleteAccount({ status: "idle" }, confirmationForm(EMAIL))).rejects.toBe(REDIRECT);

    expect(captureException).toHaveBeenCalledTimes(1);
    const [captured, context] = captureException.mock.calls[0] as [Error, { tags: Record<string, string> }];
    expect(captured).toEqual(new Error("Account deletion failed"));
    expect(context.tags.account_deletion_stage).toBe("residual-storage");
    expect(JSON.stringify({ message: captured.message, tags: context.tags })).not.toContain(USER_ID);
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(redirect).toHaveBeenCalledWith("/?account=deleted", "replace");
  });

  test.each(["storage", "ledger", "auth"] as const)(
    "a %s failure still returns the error state without signing out",
    async (stage) => {
      deleteLiveAccount.mockRejectedValue(new DeletionFailure(stage));

      await expect(deleteAccount({ status: "idle" }, confirmationForm(EMAIL))).resolves.toEqual(
        errorState("We couldn't delete your account. Please try again or contact support."),
      );
      expect(signOut).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    },
  );

  test("clears the local session and replaces the location after successful hard deletion", async () => {
    await expect(deleteAccount({ status: "idle" }, confirmationForm(EMAIL))).rejects.toBe(REDIRECT);

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(redirect).toHaveBeenCalledWith("/?account=deleted", "replace");
  });

  test("still redirects after a successful hard deletion when local sign-out fails", async () => {
    signOut.mockRejectedValue(new Error("cookie write failed"));

    await expect(deleteAccount({ status: "idle" }, confirmationForm(EMAIL))).rejects.toBe(REDIRECT);

    expect(redirect).toHaveBeenCalledWith("/?account=deleted", "replace");
  });

  test("still redirects after a successful hard deletion when local sign-out resolves with an error", async () => {
    signOut.mockResolvedValue({ error: { message: "cookie write failed" } });

    await expect(deleteAccount({ status: "idle" }, confirmationForm(EMAIL))).rejects.toBe(REDIRECT);

    expect(redirect).toHaveBeenCalledWith("/?account=deleted", "replace");
  });
});
