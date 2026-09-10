"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Kicker } from "@/components/ui-fitcheck/kicker";
import { Surface } from "@/components/ui-fitcheck/surface";
import type { ReleaseNote } from "@/lib/release-notes";

/**
 * The release note. One quiet line by default; the full list on tap.
 *
 * ⚠️ A card, not a sheet. The established modal pattern (WearConfirm, Refine,
 * Location) is right when the app needs an ANSWER; this needs nothing, and
 * `/generate` is the screen people open the app for.
 *
 * ⚠️ And collapsed, because "not a modal" was not enough on its own. The first
 * build rendered every entry, took 55% of the phone and pushed "Today's Looks"
 * below the fold — functionally the modal this design exists to avoid, just
 * without a backdrop. Announcing the update in one line and opening the detail
 * on demand keeps the news available and the screen the user came for intact.
 * It also means the notes never need truncating, so nothing is written that a
 * reader cannot get to.
 *
 * ⚠️ `Surface`, not a hand-rolled card. `.surface-card` carries the design's
 * gradient and its inset hairline together; an earlier draft wrote `bg-surface`
 * — not a real token, so silently nothing — plus its own ring, which is the flat
 * fill `surface.tsx` warns against re-adding at a call site.
 */
export function WhatsNewCard({
  release,
  onDismiss,
}: {
  release: ReleaseNote;
  onDismiss: () => void;
}) {
  const [open, setOpen] = useState(false);
  const line = "flex gap-2 text-[13px] leading-[1.4] text-muted-foreground";

  return (
    <Surface role="group" aria-label="What's new in Fitcheck" className="mx-4 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="whats-new-detail"
          className="flex min-h-[44px] flex-1 items-center gap-2 text-left"
        >
          <span className="flex-1">
            <Kicker>New in Fitcheck</Kicker>
            <span className="mt-0.5 block font-serif text-[15.5px] leading-[1.3] text-foreground">
              {release.headline}
            </span>
          </span>
          {/* ⚠️ The SAME chevron the weather strip's "later" row uses, down to
              the rotation. Without an affordance nobody learns the card opens,
              and inventing a second expander gesture for one card would teach
              the user two things where the app already teaches one. */}
          <svg
            className={cn(
              "h-[11px] w-[11px] shrink-0 text-muted-dim transition-transform",
              open && "rotate-180",
            )}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss what's new"
          className="-mr-1 min-h-[44px] min-w-[44px] shrink-0 text-[17px] text-muted-foreground"
        >
          ✕
        </button>
      </div>

      {open && (
        <div id="whats-new-detail" className="mt-3 flex flex-col gap-3">
          {release.added.length > 0 && (
            <Section title="New" items={release.added} marker="+" markerClass="text-foreground" lineClass={line} />
          )}
          {release.fixed.length > 0 && (
            // A repair is marked differently from an addition but not shouted —
            // it is reassurance, not a headline.
            <Section title="Fixed" items={release.fixed} marker="·" markerClass="text-muted-dim" lineClass={line} />
          )}
        </div>
      )}
    </Surface>
  );
}

function Section({
  title,
  items,
  marker,
  markerClass,
  lineClass,
}: {
  title: string;
  items: string[];
  marker: string;
  markerClass: string;
  lineClass: string;
}) {
  return (
    <div>
      <Kicker>{title}</Kicker>
      <ul className="mt-1.5 flex flex-col gap-1">
        {items.map((item) => (
          <li key={item} className={lineClass}>
            <span aria-hidden className={markerClass}>
              {marker}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
