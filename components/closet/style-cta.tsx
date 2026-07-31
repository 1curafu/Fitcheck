"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { styleWithItem } from "@/app/closet/[itemId]/style-actions";

/**
 * The one primary action on item detail (Fitcheck.dc.html:654).
 *
 * The outcome is a STATE, not an exception: "you have used today's stylings" and
 * "there is not enough else in your closet yet" are both real answers, and a
 * thrown error would render as a dead button with no explanation.
 */
export function StyleCta({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-1 flex-col">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMessage(null);
            const res = await styleWithItem(itemId);
            if (res.status === "ok") router.push(`/outfits/${res.outfitId}`);
            else if (res.status === "limited")
              setMessage("That's today's stylings used — back tomorrow.");
            else setMessage(res.message);
          })
        }
        className="min-h-[54px] w-full rounded-[14px] bg-foreground text-[15.5px] font-semibold text-canvas disabled:opacity-70"
      >
        {pending ? "Styling…" : "Style an outfit with this"}
      </button>
      {message && (
        <p role="status" className="mt-2 text-center text-xs text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  );
}
