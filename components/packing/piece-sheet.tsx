"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { editCapsule } from "@/app/packing/actions";

export type SheetPiece = { id: string; name: string; pinned: boolean };

/**
 * Change what goes in the case.
 *
 * ⚠️ **An edit is the SAME solve with constraints** — the engine has taken
 * `pinned` and `excluded` since PR #48, which is why they shipped unused. Pin
 * seeds a piece at zero cost so the rest is chosen around it; remove excludes it
 * and re-solves. Neither is a special code path.
 *
 * ⚠️ **A removal that breaks the trip is not silent.** If the re-solve leaves
 * days uncovered the capsule screen shows the shortfall state naming them,
 * rather than quietly handing back a smaller case.
 */
export function PieceSheet({
  tripId,
  piece,
  onClose,
}: {
  tripId: string;
  piece: SheetPiece | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // ⚠️ Routes are preserved with `<Activity hidden>` rather than unmounted, so
  // `useState` survives navigation — without this the sheet is still open when
  // you come back. Four sheets needed this fix on PRs #42–#45.
  useEffect(() => () => onClose(), [onClose]);

  if (!piece) return null;

  function act(edit: { pin?: string; remove?: string }) {
    setError(null);
    start(async () => {
      try {
        await editCapsule(tripId, edit);
        onClose();
        router.refresh();
      } catch (e) {
        setError((e as Error)?.message ?? "Could not change the case");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end" role="dialog" aria-modal="true">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-canvas/70 backdrop-blur-[2px]"
      />
      <div className="relative w-full rounded-t-[22px] bg-surface-2 px-[22px] pb-[calc(env(safe-area-inset-bottom)+18px)] pt-5 shadow-[inset_0_0_0_1px_var(--hairline-6)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--hairline-6)]" />
        <p className="font-serif text-[22px] text-foreground">{piece.name}</p>

        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={() => act(piece.pinned ? { remove: piece.id } : { pin: piece.id })}
            disabled={pending}
            className="rounded-[12px] bg-surface-3 py-[15px] text-center text-[15px] text-foreground shadow-[inset_0_0_0_1px_var(--hairline-6)] disabled:opacity-60"
          >
            {piece.pinned ? "Stop insisting on this" : "I'm definitely bringing this"}
          </button>
          <button
            onClick={() => act({ remove: piece.id })}
            disabled={pending}
            className="rounded-[12px] bg-surface-3 py-[15px] text-center text-[15px] text-brand-high shadow-[inset_0_0_0_1px_var(--hairline-6)] disabled:opacity-60"
          >
            Leave this behind
          </button>
          <Link
            href={`/closet/${piece.id}`}
            className="rounded-[12px] py-[15px] text-center text-[15px] text-muted-foreground"
          >
            See the piece
          </Link>
        </div>

        {pending && (
          <p role="status" className="mt-3 text-center text-[13px] text-muted-foreground">
            Repacking…
          </p>
        )}
        {error && <p className="mt-3 text-center text-[13px] text-brand">{error}</p>}
      </div>
    </div>
  );
}
