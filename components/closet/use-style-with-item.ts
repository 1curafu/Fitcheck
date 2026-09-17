"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { styleWithItem } from "@/app/closet/[itemId]/style-actions";

/**
 * Style a look around one piece, and land on it.
 *
 * Shared by the item page's primary ("Style an outfit with this") and the look
 * page's "Try another look". They differ only in `regenerate`; the outcome
 * handling is identical and used to be duplicated in spirit. The outcome is a
 * STATE, not an exception: "this is a Pro feature" and "there is not enough
 * else in your closet yet" are both real answers, and a thrown error would
 * render as a dead button with no explanation.
 *
 * A Pro gate and a thin closet get different weight — the first is a sheet that
 * explains and sells; the second is a quiet line, because there is nothing to
 * buy, you add a piece.
 */
export function useStyleWithItem(itemId: string) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState<string | null>(null);

  function run(regenerate: boolean) {
    start(async () => {
      setMessage(null);
      setUpgrade(null);
      const res = await styleWithItem(itemId, { regenerate });
      if (res.status === "ok") router.push(`/outfits/${res.outfitIds[0]}`);
      // The reason is rendered verbatim, never re-worded here: it used to
      // promise "back tomorrow" for a Pro capability, which never arrives.
      else if (res.status === "limited") setUpgrade(res.message);
      else setMessage(res.message);
    });
  }

  return { run, pending, message, upgrade, dismissUpgrade: () => setUpgrade(null) };
}
