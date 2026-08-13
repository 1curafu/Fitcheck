"use client";

import { useState, useTransition } from "react";
import { answerWearConfirmation } from "@/app/outfits/[id]/actions";
import { WearConfirmSheet } from "./wear-confirm-sheet";

/**
 * Mounts the evening confirmation on the stylist screen.
 *
 * The DECISION is made on the server (`shouldAsk`) and arrives already made —
 * this only owns the answering. Keeping the rule server-side means the sheet
 * cannot appear because of a stale client clock, and the local hour is computed
 * from `profiles.location_timezone` rather than the device.
 */
export function WearConfirm({
  outfitId,
  lookName,
}: {
  outfitId: string;
  lookName: string;
}) {
  const [open, setOpen] = useState(true);
  const [pending, start] = useTransition();

  function answer(wore: boolean) {
    start(async () => {
      await answerWearConfirmation(outfitId, wore).catch(() => {});
      setOpen(false);
    });
  }

  return (
    <WearConfirmSheet
      open={open}
      lookName={lookName}
      pending={pending}
      onYes={() => answer(true)}
      onNo={() => answer(false)}
      // Records NOTHING — the question stays askable, so a mis-tap does not
      // silently consume the day's only chance to log the wear.
      onDismiss={() => setOpen(false)}
    />
  );
}
