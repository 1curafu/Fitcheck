"use client";

import { Kicker } from "@/components/ui-fitcheck/kicker";

/**
 * "Did you wear this today?" — asked once, in the evening.
 *
 * The honest replacement for the rejected "Auto-log worn looks" toggle. Opening
 * a look is not wearing it, and `wear_logs` is the foundation of cost-per-wear,
 * streaks, most-worn and gap analysis — so the app asks rather than assumes.
 *
 * ⚠️ **Yes and No are styled IDENTICALLY, and that is the whole design.** A lone
 * "Yes" with a dismiss ✕ gets tapped to clear the sheet, and the data inflates
 * anyway — which is the exact failure that got auto-log rejected. There is also
 * no "Not now", "Skip" or close button, for the same reason: the easiest escape
 * becomes the default answer, and here the default answer would be a lie.
 *
 * The backdrop closes for this session WITHOUT recording an answer, so a
 * mis-tap does not silently consume the day's question. It is the only way out
 * that is neither Yes nor No, and it is deliberately the one that changes
 * nothing.
 */
export function WearConfirmSheet({
  open,
  lookName,
  pending = false,
  onYes,
  onNo,
  onDismiss,
}: {
  open: boolean;
  lookName: string;
  pending?: boolean;
  onYes: () => void;
  onNo: () => void;
  /** Backdrop only. Records NOTHING — the question stays askable. */
  onDismiss: () => void;
}) {
  if (!open) return null;

  // One string, used twice. Two class lists that merely look alike are two
  // things that can drift; the test asserts they are equal, and this is how
  // that stays true.
  const answer =
    "min-h-[52px] flex-1 rounded-[14px] text-[15.5px] font-semibold text-foreground shadow-[inset_0_0_0_1px_var(--hairline-6)] disabled:opacity-60";

  return (
    <>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="fixed inset-0 z-[60] bg-[rgba(6,6,8,0.5)] backdrop-blur-[1.5px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Wear confirmation"
        style={{ maxWidth: 440 }}
        className="fixed inset-x-0 bottom-0 z-[70] mx-auto rounded-t-[22px] border-t border-[rgba(237,230,216,0.12)] bg-surface-2 px-[22px] pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3.5"
      >
        <div className="mx-auto mb-4 h-1 w-[34px] rounded-full bg-faint" />

        <Kicker className="block">Today</Kicker>
        <h2 className="mt-1.5 font-serif text-[22px]/[1.2] text-foreground text-pretty">
          Did you wear {lookName} today?
        </h2>
        <p className="mt-1.5 text-[12.5px] text-muted-foreground">
          Only you can say — we never log a wear for you.
        </p>

        <div className="mt-4 flex gap-2">
          <button type="button" disabled={pending} onClick={onNo} className={answer}>
            No
          </button>
          <button type="button" disabled={pending} onClick={onYes} className={answer}>
            Yes
          </button>
        </div>
      </div>
    </>
  );
}
