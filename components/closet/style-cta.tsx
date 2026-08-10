"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { styleWithItem } from "@/app/closet/[itemId]/style-actions";
import { UpgradeSheet } from "@/components/billing/upgrade-sheet";

/**
 * The one primary action on item detail (Fitcheck.dc.html:654).
 *
 * The outcome is a STATE, not an exception: "this is a Pro feature" and "there
 * is not enough else in your closet yet" are both real answers, and a thrown
 * error would render as a dead button with no explanation.
 *
 * The button stays VISIBLE and enabled for free users on purpose. Nobody buys a
 * feature they have never seen, and this screen — the canonical one — is where
 * the want is felt. Tapping it explains the feature rather than doing nothing.
 */
export function StyleCta({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  // A Pro gate and "your closet is too thin for this yet" are different answers
  // and get different weight: the first is a sheet that explains and sells, the
  // second is a quiet line, because there is nothing to buy — you add a piece.
  const [upgrade, setUpgrade] = useState<string | null>(null);
  // Only offered once a set exists. "Try another" before there IS another is a
  // control with nothing to compare against.
  const [styled, setStyled] = useState(false);

  function run(regenerate: boolean) {
    start(async () => {
      setMessage(null);
      setUpgrade(null);
      const res = await styleWithItem(itemId, { regenerate });
      if (res.status === "ok") {
        setStyled(true);
        router.push(`/outfits/${res.outfitIds[0]}`);
      }
      // The reason is rendered verbatim, never re-worded here. It used to read
      // "that's today's stylings used — back tomorrow", written when styling
      // was assumed to share the daily generation allowance. It is a Pro
      // capability, so tomorrow gives a free user no more of them — the old
      // copy told people to wait for something that would never arrive.
      else if (res.status === "limited") setUpgrade(res.message);
      else setMessage(res.message);
    });
  }

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

      {/* A bounded secondary with WORDS, below the primary — the shape PR #20
          arrived at after an icon-only Regenerate was tried and rejected,
          because nothing tells you a ⟳ means "spend an AI call". It exists
          because the cache is right but silent: tapping again returned the
          identical look with no explanation. */}
      {styled && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(true)}
          className="mx-auto mt-2 min-h-[44px] rounded-full px-4 text-[13px] text-muted-foreground shadow-[inset_0_0_0_1px_var(--hairline-4)] disabled:opacity-60"
        >
          {pending ? "Styling…" : "Try another look"}
        </button>
      )}

      {message && (
        <p role="status" className="mt-2 text-center text-xs text-muted-foreground">
          {message}
        </p>
      )}

      <UpgradeSheet
        open={Boolean(upgrade)}
        title="Style a look around any piece"
        body={upgrade ?? ""}
        onClose={() => setUpgrade(null)}
      />
    </div>
  );
}
