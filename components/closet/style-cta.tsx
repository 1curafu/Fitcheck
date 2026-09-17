"use client";

import { UpgradeSheet } from "@/components/billing/upgrade-sheet";
import { useStyleWithItem } from "./use-style-with-item";

/**
 * The one primary action on item detail (Fitcheck.dc.html:654).
 *
 * The button stays VISIBLE and enabled for free users on purpose. Nobody buys a
 * feature they have never seen, and this screen — the canonical one — is where
 * the want is felt. Tapping it explains the feature rather than doing nothing.
 *
 * ⚠️ Only the primary lives here now. "Try another look" used to render as a
 * second row beneath it, which made this component grow taller than the
 * archive button beside it in the sticky cluster — the primary floated up, the
 * secondary hung below over the bottom bar, and the whole thing read as broken.
 * It was also the wrong page: you reject a look while LOOKING at it. It lives on
 * the look page now (`components/outfits/try-another-look.tsx`).
 *
 * The first tap is a cache-friendly read: a piece already styled today lands on
 * that look, where the regenerate control is.
 */
export function StyleCta({ itemId }: { itemId: string }) {
  const { run, pending, message, upgrade, dismissUpgrade } = useStyleWithItem(itemId);

  return (
    <div className="flex flex-1 flex-col">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(false)}
        className="min-h-[54px] w-full rounded-[14px] bg-foreground text-[15.5px] font-semibold text-canvas disabled:opacity-70"
      >
        {pending ? "Styling…" : "Style an outfit with this"}
      </button>

      {message && (
        <p role="status" className="mt-2 text-center text-xs text-muted-foreground">
          {message}
        </p>
      )}

      <UpgradeSheet
        open={Boolean(upgrade)}
        title="Style a look around any piece"
        body={upgrade ?? ""}
        onClose={dismissUpgrade}
      />
    </div>
  );
}
