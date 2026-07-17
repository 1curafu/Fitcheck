"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCapture } from "./use-capture";
import { Viewfinder } from "./viewfinder";
import { ConfirmForm } from "./confirm-form";
import { ProgressStrip } from "./progress-strip";
import { Kicker } from "@/components/ui-fitcheck/kicker";

export function OnboardingCapture({ initialCount = 0 }: { initialCount?: number }) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const cap = useCapture({ onSaved: () => setCount((c) => c + 1) });

  const hasItems = count >= 1;

  if (cap.phase === "confirm" && cap.draft) {
    return (
      <main className="flex flex-1 flex-col px-6 pb-7 pt-12">
        <ConfirmForm
          draft={cap.draft}
          saving={cap.saving}
          error={cap.error}
          onDraft={cap.updateDraft}
          onTags={cap.updateTags}
          onToggleSeason={cap.toggleSeason}
          onSave={cap.save}
        />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col px-6 pb-7 pt-[30px]">
      <Kicker className="mb-[10px] block">Almost there</Kicker>
      <h1 className="mb-[6px] font-serif text-3xl/[1.12] text-foreground">
        Capture your first five.
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Snap each piece on a flat surface. We cut it out and learn its colour, fabric and formality.
      </p>
      <Viewfinder busy={cap.phase === "removing"} onFile={cap.capture} />
      <ProgressStrip filled={count} />
      {cap.error && <p className="mt-4 text-sm text-brand">{cap.error}</p>}
      <div className="flex-1" />
      <button
        onClick={() => router.push("/closet")}
        className={`mt-[22px] rounded-[12px] py-[17px] text-center font-semibold transition-colors ${
          hasItems ? "bg-brand text-canvas" : "bg-foreground/10 text-muted-dim"
        }`}
      >
        {hasItems ? "Enter your closet" : "Skip for now"}
      </button>
    </main>
  );
}
