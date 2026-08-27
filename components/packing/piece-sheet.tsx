"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { editCapsule } from "@/app/packing/actions";

export type SheetPiece = { id: string; name: string; pinned: boolean; category: string };
/** A closet piece offered as a replacement. */
export type Alternative = { id: string; name: string; category: string; imageUrl: string };

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
  alternatives,
  onClose,
}: {
  tripId: string;
  piece: SheetPiece | null;
  /** Everything else in the closet, so a swap can offer the same category. */
  alternatives: Alternative[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [swapping, setSwapping] = useState(false);

  /**
   * ⚠️ **The sheet used to close itself the instant it opened.**
   *
   * The cleanup depended on `onClose`, which the parent passes as an inline
   * `() => setSelected(null)` — a NEW function on every render. So the effect
   * re-ran constantly and its cleanup fired immediately, and the sheet was
   * unusable. Settings gets this right with empty deps and a stable setter.
   *
   * The ref keeps the latest callback without making it a dependency, so the
   * effect runs exactly once and its cleanup fires only on unmount — which is
   * what it is for: routes are preserved with `<Activity hidden>` rather than
   * unmounted, so `useState` survives navigation and a sheet left open is
   * still open when you come back. Four sheets needed this on PRs #42–#45.
   */
  const closeRef = useRef(onClose);
  // Assigned in an effect, not during render — a ref written while rendering
  // can leave the component not updating as expected, and the lint rule that
  // says so is right.
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => () => closeRef.current(), []);

  if (!piece) return null;

  function act(edit: { pin?: string; remove?: string; swapFor?: string }) {
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

  // Same category only. Offering a shirt in place of shoes would produce a
  // capsule that cannot dress the days it was solved for.
  const swaps = alternatives.filter((a) => a.category === piece.category && a.id !== piece.id);

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

        {swapping ? (
          <div className="mt-4 max-h-[46vh] overflow-y-auto">
            {swaps.length === 0 ? (
              <p className="py-6 text-center text-[14px] text-muted-foreground">
                Nothing else in your closet fits this slot.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {swaps.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => act({ swapFor: a.id, remove: piece.id })}
                    disabled={pending}
                    className="flex items-center gap-3 rounded-[12px] bg-surface-3 p-3 text-left shadow-[inset_0_0_0_1px_var(--hairline-6)] disabled:opacity-60"
                  >
                    <span className="grid size-12 shrink-0 place-items-center rounded-[10px] bg-surface-1">
                      {a.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.imageUrl} alt="" className="size-full object-contain p-1" />
                      )}
                    </span>
                    <span className="flex-1 text-[15px] text-foreground">{a.name}</span>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setSwapping(false)}
              className="mt-3 w-full py-3 text-center text-[14px] text-muted-foreground"
            >
              Back
            </button>
          </div>
        ) : (
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={() => setSwapping(true)}
            disabled={pending}
            className="rounded-[12px] bg-surface-3 py-[15px] text-center text-[15px] text-foreground shadow-[inset_0_0_0_1px_var(--hairline-6)] disabled:opacity-60"
          >
            Take something else instead
          </button>
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
        )}

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
