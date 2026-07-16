"use client";

import { useRef } from "react";

export function Viewfinder({
  busy,
  onFile,
}: {
  busy: boolean;
  onFile: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {/* No `capture` attribute → phones offer Photo Library / Take Photo / Choose File. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        aria-label="Capture an item"
        className="relative aspect-[1.15] overflow-hidden rounded-[18px] bg-[radial-gradient(120%_120%_at_50%_30%,#1b1a1d_0%,#121113_100%)] shadow-[inset_0_0_0_1px_rgba(237,230,216,0.07)]"
      >
        <span className="absolute left-[18px] top-[18px] size-[26px] rounded-tl-[6px] border-l-2 border-t-2 border-foreground/40" />
        <span className="absolute right-[18px] top-[18px] size-[26px] rounded-tr-[6px] border-r-2 border-t-2 border-foreground/40" />
        <span className="absolute bottom-[18px] left-[18px] size-[26px] rounded-bl-[6px] border-b-2 border-l-2 border-foreground/40" />
        <span className="absolute bottom-[18px] right-[18px] size-[26px] rounded-br-[6px] border-b-2 border-r-2 border-foreground/40" />
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-dim">
          {busy ? (
            <>
              <span className="size-9 animate-spin rounded-full border-2 border-foreground/15 border-t-brand" />
              <span className="text-[13px]">Cutting out &amp; reading colours…</span>
            </>
          ) : (
            <>
              <span className="grid size-14 place-items-center rounded-full border border-foreground/20">
                <span className="size-8 rounded-full bg-brand" />
              </span>
              <span className="text-[13px]">Tap to capture an item</span>
            </>
          )}
        </span>
      </button>
    </>
  );
}
