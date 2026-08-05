"use client";

import { Kicker } from "@/components/ui-fitcheck/kicker";

/**
 * The one place a Pro gate explains itself.
 *
 * Five surfaces are gated (styled looks, wear-stats analytics, gap analysis,
 * unlimited regenerates, packing mode), so this is a shared component for the
 * same reason `lib/billing` is a shared seam: writing the explanation five
 * times is how five screens end up disagreeing about what Pro is.
 *
 * It exists because the first version put a small muted line under the primary
 * button. That reads as a validation error — something you did wrong — rather
 * than a feature you have not bought, and it offered no way forward.
 *
 * Deliberately NOT a hard paywall in front of the button: the control stays
 * live and tappable, because nobody buys a feature they have never reached for.
 * The sheet is the answer to the tap, not a fence around it.
 */
export function UpgradeSheet({
  open,
  title,
  body,
  onClose,
}: {
  open: boolean;
  /** What the user just tried to do, in their words. */
  title: string;
  /** The seam's own reason — never re-worded here. */
  body: string;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        // Above the bottom nav, which is also z-50 (`mobile-nav.tsx`). At equal
        // z-index DOM order decides, and the nav renders after the page content
        // — so it painted straight over this sheet's primary button.
        className="fixed inset-0 z-[60] bg-[rgba(6,6,8,0.5)] backdrop-blur-[1.5px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-[440px] rounded-t-[22px] border-t border-[rgba(237,230,216,0.12)] bg-surface-2 px-[22px] pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3.5"
      >
        <div className="mx-auto mb-4 h-1 w-[34px] rounded-full bg-faint" />

        {/* The screen's single rust spend — the One Rust Rule. */}
        <Kicker variant="brand" className="block">
          Pro
        </Kicker>

        <h2 className="mt-2 font-serif text-[24px]/[1.15] text-foreground">{title}</h2>
        <p className="mt-2 text-sm/[1.5] text-muted-foreground text-pretty">{body}</p>

        {/* No checkout yet — billing is a later phase, and a dead "Upgrade"
            button that goes nowhere is worse than none. This closes honestly;
            the Pro card on the profile hub becomes the real destination when it
            exists (queue #9). */}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 min-h-[52px] w-full rounded-[14px] bg-foreground text-[15.5px] font-semibold text-canvas"
        >
          Got it
        </button>
      </div>
    </>
  );
}
