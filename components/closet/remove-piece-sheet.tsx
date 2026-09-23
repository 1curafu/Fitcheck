"use client";

import { useEffect } from "react";
import { Kicker } from "@/components/ui-fitcheck/kicker";

/**
 * Confirms removing a piece from the closet, in place of the browser's own `confirm()`.
 *
 * Removing ARCHIVES: the piece leaves the closet and new looks, while past looks and wear history keep it, and its
 * photos stay stored until the account is deleted. The copy says exactly that — it is the promise the privacy record
 * makes. A permanent per-piece delete is a separate roadmap item.
 */
export function RemovePieceSheet({
  pending,
  onConfirm,
  onClose,
}: {
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        disabled={pending}
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-[rgba(6,6,8,0.5)] backdrop-blur-[1.5px] disabled:cursor-not-allowed"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-piece-title"
        style={{ maxWidth: 440 }}
        className="fixed inset-x-0 bottom-0 z-[70] mx-auto rounded-t-[22px] border-t border-[rgba(237,230,216,0.12)] bg-surface-2 px-[22px] pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3.5"
      >
        <div className="mx-auto mb-4 h-1 w-[34px] rounded-full bg-faint" />

        <Kicker className="block">Closet</Kicker>
        <h2 id="remove-piece-title" className="mt-1.5 font-serif text-[24px]/[1.15] text-foreground">
          Remove this piece?
        </h2>
        <p className="mt-2 text-[13px]/[1.5] text-muted-foreground">
          It leaves your closet and won&rsquo;t appear in new looks. Past looks and your wear history keep it.
        </p>
        <p className="mt-2 text-[13px]/[1.5] text-muted-foreground">
          Its photos stay saved with your account, and are deleted if you delete your account.
        </p>

        <button
          type="button"
          disabled={pending}
          onClick={onConfirm}
          className="mt-5 min-h-[44px] w-full rounded-[12px] bg-brand-deep px-4 py-3 text-[14px] font-semibold text-foreground disabled:cursor-not-allowed disabled:bg-foreground/10 disabled:text-muted-dim"
        >
          {pending ? "Removing…" : "Remove from closet"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onClose}
          className="mt-3 min-h-[44px] w-full text-[14px] text-muted-foreground disabled:cursor-not-allowed disabled:text-muted-dim"
        >
          Cancel
        </button>
      </div>
    </>
  );
}
