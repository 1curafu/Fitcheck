"use client";

import { useRouter } from "next/navigation";
import { useCapture } from "./use-capture";
import { Viewfinder } from "./viewfinder";
import { ConfirmForm } from "./confirm-form";
import { Kicker } from "@/components/ui-fitcheck/kicker";

export function CaptureFlow() {
  const router = useRouter();
  const cap = useCapture({ onSaved: () => router.push("/closet") });

  return (
    <main className="flex flex-1 flex-col px-6 pb-7 pt-12">
      {cap.phase !== "confirm" || !cap.draft ? (
        <>
          <Kicker className="mb-[10px] block">Add a piece</Kicker>
          <h1 className="mb-6 font-serif text-3xl/[1.12] text-foreground">Capture an item.</h1>
          <Viewfinder busy={cap.phase === "removing"} onFile={cap.capture} />
          <p className="mt-6 text-sm text-muted-foreground">
            Snap each piece on a flat surface. We cut it out and learn its colour, fabric and formality.
          </p>
          {cap.error && <p className="mt-4 text-sm text-brand">{cap.error}</p>}
        </>
      ) : (
        <ConfirmForm
          draft={cap.draft}
          saving={cap.saving}
          error={cap.error}
          onDraft={cap.updateDraft}
          onTags={cap.updateTags}
          onToggleSeason={cap.toggleSeason}
          onSave={cap.save}
        />
      )}
    </main>
  );
}
