"use client";

import { UpgradeSheet } from "@/components/billing/upgrade-sheet";
import { useStyleWithItem } from "@/components/closet/use-style-with-item";

/**
 * Regenerate a look that was styled around one piece — from the look itself.
 *
 * A bounded secondary with WORDS. PR #20 tried an icon-only ⟳ on the stylist
 * screen and rejected it: nothing tells you a ⟳ means "spend an AI call". It
 * exists because the cache is right but silent — tapping the item's primary
 * again returns the identical look with no explanation.
 *
 * ⚠️ Rendered only for a look that HAS a styled item. The daily drop's looks
 * are regenerated from the stylist screen, as a set; this is for the one-piece
 * "style an outfit with this" path, where there is a specific piece to keep.
 */
export function TryAnotherLook({ itemId }: { itemId: string }) {
  const { run, pending, message, upgrade, dismissUpgrade } = useStyleWithItem(itemId);

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(true)}
        className="min-h-[40px] rounded-full px-5 text-[13px] text-muted-foreground shadow-[inset_0_0_0_1px_var(--hairline-4)] disabled:opacity-60"
      >
        {pending ? "Styling…" : "Try another look"}
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
