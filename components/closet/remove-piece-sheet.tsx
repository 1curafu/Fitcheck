"use client";

import { useEffect, useState } from "react";
import { Kicker } from "@/components/ui-fitcheck/kicker";

/**
 * Removing a piece, in place of the browser's `confirm()`.
 *
 * "Remove from closet" ARCHIVES and can be undone from Removed pieces. The second option also erases the ORIGINAL photo
 * for good (spec 2026-09-26): it is quieter on purpose and always goes through its own confirm step, because it is the
 * only irreversible thing on this screen. The cut-out stays, so past looks are unchanged.
 */
export function RemovePieceSheet({
  pending,
  canErase,
  startAt = "choose",
  error,
  onRemove,
  onErase,
  onDelete,
  onClose,
}: {
  pending: boolean;
  canErase: boolean;
  startAt?: "choose" | "erase" | "delete";
  error: string | null;
  onRemove: () => void;
  onErase: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"choose" | "erase" | "delete">(startAt);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  const erasing = step === "erase";

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

        {step === "delete" ? (
          <>
            <h2 id="remove-piece-title" className="mt-1.5 font-serif text-[24px]/[1.15] text-foreground">
              Delete this piece for good?
            </h2>
            <p className="mt-2 text-[13px]/[1.5] text-muted-foreground">
              Its photos, cut-out and details are deleted. Past looks, your calendar and trips keep their other pieces; a
              look styled around this piece is deleted with it.
            </p>
            <p className="mt-2 text-[13px]/[1.5] text-muted-foreground">
              This can&rsquo;t be undone. Copies in our encrypted backups expire within 30 days.
            </p>
            {error && (
              <p role="alert" className="mt-3 text-[13px]/[1.5] text-foreground">
                {error}
              </p>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={onDelete}
              className="mt-5 min-h-[44px] w-full rounded-[12px] bg-destructive/90 px-4 py-3 text-[14px] font-semibold text-foreground disabled:cursor-not-allowed disabled:bg-foreground/10 disabled:text-muted-dim"
            >
              {pending ? "Deleting…" : "Delete for good"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={onClose}
              className="mt-3 min-h-[44px] w-full text-[14px] text-muted-foreground disabled:cursor-not-allowed disabled:text-muted-dim"
            >
              Back
            </button>
          </>
        ) : erasing ? (
          <>
            <h2 id="remove-piece-title" className="mt-1.5 font-serif text-[24px]/[1.15] text-foreground">
              Erase the original photo?
            </h2>
            <p className="mt-2 text-[13px]/[1.5] text-muted-foreground">
              The photo you took is erased for good. The cut-out garment stays in your past looks, calendar and wear
              history, and you can still put the piece back.
            </p>
            <p className="mt-2 text-[13px]/[1.5] text-muted-foreground">
              Copies in our encrypted backups expire within 30 days. An erased original can&rsquo;t be used to make a
              better cut-out later.
            </p>
            {error && (
              <p role="alert" className="mt-3 text-[13px]/[1.5] text-foreground">
                {error}
              </p>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={onErase}
              className="mt-5 min-h-[44px] w-full rounded-[12px] bg-destructive/90 px-4 py-3 text-[14px] font-semibold text-foreground disabled:cursor-not-allowed disabled:bg-foreground/10 disabled:text-muted-dim"
            >
              {pending ? "Erasing…" : "Erase original"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => (startAt === "erase" ? onClose() : setStep("choose"))}
              className="mt-3 min-h-[44px] w-full text-[14px] text-muted-foreground disabled:cursor-not-allowed disabled:text-muted-dim"
            >
              Back
            </button>
          </>
        ) : (
          <>
            <h2 id="remove-piece-title" className="mt-1.5 font-serif text-[24px]/[1.15] text-foreground">
              Remove this piece?
            </h2>
            <p className="mt-2 text-[13px]/[1.5] text-muted-foreground">
              It leaves your closet and won&rsquo;t appear in new looks. Past looks and your wear history keep it.
            </p>
            <p className="mt-2 text-[13px]/[1.5] text-muted-foreground">
              You can put it back from Removed pieces.
            </p>
            <button
              type="button"
              disabled={pending}
              onClick={onRemove}
              className="mt-5 min-h-[44px] w-full rounded-[12px] bg-brand-deep px-4 py-3 text-[14px] font-semibold text-foreground disabled:cursor-not-allowed disabled:bg-foreground/10 disabled:text-muted-dim"
            >
              {pending ? "Removing…" : "Remove from closet"}
            </button>
            {canErase && (
              <button
                type="button"
                disabled={pending}
                onClick={() => setStep("erase")}
                className="mt-3 min-h-[44px] w-full text-[14px] text-muted-foreground underline underline-offset-4 disabled:cursor-not-allowed disabled:text-muted-dim"
              >
                Remove and erase original photo
              </button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={onClose}
              className="mt-1 min-h-[44px] w-full text-[14px] text-muted-foreground disabled:cursor-not-allowed disabled:text-muted-dim"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </>
  );
}
