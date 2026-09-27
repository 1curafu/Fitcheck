"use client";
import { useTranslations } from "next-intl";

import { useActionState, useState } from "react";
import { Kicker } from "@/components/ui-fitcheck/kicker";
import type { deleteAccount } from "@/app/[locale]/settings/actions";

type DeleteAccountSheetProps = {
  open: boolean;
  email: string;
  action: typeof deleteAccount;
  onClose: () => void;
};

/**
 * The irreversible account boundary lives in its own sheet so Settings remains
 * scannable, while the confirmation has enough room to say exactly what is at
 * stake. Returning null recreates the form on every close, so preserved routes
 * cannot revive an old email confirmation or action error.
 */
export function DeleteAccountSheet({ open, email, action, onClose }: DeleteAccountSheetProps) {
  if (!open) return null;

  return <DeleteAccountForm email={email} action={action} onClose={onClose} />;
}

function DeleteAccountForm({
  email,
  action,
  onClose,
}: Omit<DeleteAccountSheetProps, "open">) {
  const t = useTranslations("settings");
  const tRoot = useTranslations();
  const [state, formAction, isPending] = useActionState(action, { status: "idle" });
  const [confirmation, setConfirmation] = useState("");
  const canDelete = confirmation === email && !isPending;

  function close() {
    if (isPending) return;
    setConfirmation("");
    onClose();
  }

  return (
    <>
      <button
        type="button"
        aria-label={t("delete.close")}
        disabled={isPending}
        onClick={close}
        className="fixed inset-0 z-[60] bg-[rgba(6,6,8,0.5)] backdrop-blur-[1.5px] disabled:cursor-not-allowed"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("deleteAccount")}
        style={{ maxWidth: 440 }}
        className="fixed inset-x-0 bottom-0 z-[70] mx-auto rounded-t-[22px] border-t border-[rgba(237,230,216,0.12)] bg-surface-2 px-[22px] pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3.5"
      >
        <div className="mx-auto mb-4 h-1 w-[34px] rounded-full bg-faint" />

        <Kicker className="block">
          {t("dangerZone")}
        </Kicker>
        <h2 className="mt-1.5 font-serif text-[24px]/[1.15] text-foreground">
          {t("deleteAccount")}
        </h2>
        <p className="mt-2 text-[13px]/[1.5] text-muted-foreground">
          {t("delete.description")}
        </p>
        <p className="mt-2 text-[13px]/[1.5] text-muted-foreground">
          {t("delete.backup")}
        </p>

        <form action={formAction} className="mt-4">
          <label htmlFor="delete-account-confirmation" className="text-[13px] text-foreground">
            {t("delete.confirm")}
          </label>
          <p className="mt-1 text-[12px] text-muted-foreground">{email}</p>
          <input
            id="delete-account-confirmation"
            name="confirmation"
            type="email"
            value={confirmation}
            disabled={isPending}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            className="mt-2 min-h-[44px] w-full rounded-[12px] border border-[--input] bg-surface-1 px-3 text-[14px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand/50 disabled:cursor-not-allowed disabled:text-muted-dim"
          />

          {state.status === "error" && (
            <p role="status" className="mt-2 text-[12.5px] text-brand-high">
              {tRoot(state.message)}
            </p>
          )}

          <button
            type="submit"
            disabled={!canDelete}
            className="mt-4 min-h-[44px] w-full rounded-[12px] bg-brand-deep px-4 py-3 text-[14px] font-semibold text-foreground disabled:cursor-not-allowed disabled:bg-foreground/10 disabled:text-muted-dim"
          >
            {isPending ? t("delete.deleting") : t("deleteAccount")}
          </button>
        </form>

        <button
          type="button"
          disabled={isPending}
          onClick={close}
          className="mt-3 min-h-[44px] w-full text-[14px] text-muted-foreground disabled:cursor-not-allowed disabled:text-muted-dim"
        >
          {t("delete.cancel")}
        </button>
      </div>
    </>
  );
}
