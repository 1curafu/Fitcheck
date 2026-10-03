"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { loadFonts } from "@/lib/share/render";
import { renderDnaCard } from "@/lib/style-dna/render";
import type { DnaCardInput } from "@/lib/style-dna/card";

/** Renders the Story on mount so `navigator.share` runs inside the tap (iOS); otherwise downloads, as the look share sheet does. */
export function ShareDna({ input, fileName }: { input: DnaCardInput; fileName: string }) {
  const t = useTranslations("styleDna");
  const [rendered, setRendered] = useState<{ key: string; blob: Blob } | null>(null);
  const [failed, setFailed] = useState(false);
  // The content, not the object identity, decides when to redraw.
  const key = JSON.stringify(input);
  const blob = rendered?.key === key ? rendered.blob : null;

  useEffect(() => {
    let live = true;
    loadFonts().then((fonts) => renderDnaCard(JSON.parse(key) as DnaCardInput, fonts))
      .then((b) => { if (live) setRendered({ key, blob: b }); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [key]);

  function share() {
    if (!blob) return;
    const file = new File([blob], fileName, { type: "image/jpeg" });
    if (navigator.canShare?.({ files: [file] })) {
      navigator.share({ files: [file] }).catch((e) => { if (e?.name !== "AbortError") setFailed(true); });
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
  }

  return (
    <div className="mt-[14px]">
      <button type="button" onClick={share} disabled={!blob}
        className="h-[48px] w-full rounded-[14px] bg-foreground text-[15px] font-medium text-background disabled:opacity-50">
        {blob ? t("share") : t("preparing")}
      </button>
      {failed ? <p role="alert" className="mt-2 text-[13px] text-muted-foreground">{t("shareFailed")}</p> : null}
    </div>
  );
}
