"use client";

import {
  RotateCcw,
  Sparkles,
  Shirt,
  Luggage,
  ChartColumn,
  Compass,
  Bookmark,
} from "lucide-react";
import { Kicker } from "@/components/ui-fitcheck/kicker";

/**
 * What Pro unlocks, in the order MONETISATION.md §3 lists it.
 *
 * Lives here rather than on the profile hub because this sheet is the ONLY
 * place the pitch is made — from a gate or from the Pro card, the user sees the
 * same list. Two copies is how two surfaces end up disagreeing about the tier.
 *
 * Icons are muted, not rust: seven rust glyphs would spend the One Rust Rule
 * seven times over. The kicker is this sheet's single rust element.
 */
export const PRO_BENEFITS = [
  { icon: RotateCcw, label: "Unlimited rerolls", desc: "Any occasion, as often as you like" },
  { icon: Sparkles, label: "Style around any piece", desc: "Build a look from one garment" },
  { icon: Shirt, label: "An unlimited closet", desc: "Past the free 50 pieces" },
  { icon: Luggage, label: "Packing mode", desc: "A trip in, a capsule out" },
  { icon: ChartColumn, label: "Cost-per-wear analytics", desc: "What your wardrobe really costs" },
  { icon: Compass, label: "Gap analysis", desc: "The one piece that unlocks the most" },
  { icon: Bookmark, label: "Unlimited saved outfits", desc: "Keep every look you love" },
];

/**
 * The one place a Pro gate explains itself.
 *
 * Five surfaces are gated, so this is shared for the same reason `lib/billing`
 * is a shared seam: writing the explanation five times is how five screens end
 * up disagreeing about what Pro is.
 *
 * It exists because the first version put a small muted line under the primary
 * button, which read as a validation error — something you did wrong — rather
 * than a feature you have not bought.
 *
 * Deliberately NOT a hard paywall in front of the control: the gated button
 * stays live and tappable, because nobody buys a feature they have never
 * reached for. The sheet is the answer to the tap, not a fence around it.
 */
export function UpgradeSheet({
  open,
  title,
  body,
  isPro = false,
  onClose,
}: {
  open: boolean;
  /** What the user just tried to do, in their words. */
  title: string;
  /** The seam's own reason, when opened from a gate. Never re-worded here. */
  body?: string;
  /** A subscriber gets the same list as a receipt, never a sales pitch. */
  isPro?: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        // Above the bottom nav, which is also z-50 (`mobile-nav.tsx`). At equal
        // z-index DOM order decides, and the nav renders after the page content
        // — so it painted straight over this sheet's primary button.
        className="fixed inset-0 z-[60] bg-[rgba(6,6,8,0.5)] backdrop-blur-[1.5px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        // maxWidth inline for the same reason the row geometry is: the shell
        // caps at 440 and a sheet wider than it would hang off the app on a
        // desktop viewport.
        style={{ maxWidth: 440 }}
        className="fixed inset-x-0 bottom-0 z-[70] mx-auto rounded-t-[22px] border-t border-[rgba(237,230,216,0.12)] bg-surface-2 px-[22px] pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3.5"
      >
        <div className="mx-auto mb-4 h-1 w-[34px] rounded-full bg-faint" />

        {/* The screen's single rust spend — the One Rust Rule. */}
        <Kicker variant="brand" className="block">
          Pro
        </Kicker>

        <h2 className="mt-2 font-serif text-[24px]/[1.15] text-foreground">{title}</h2>
        {body && <p className="mt-2 text-sm/[1.5] text-muted-foreground text-pretty">{body}</p>}

        {/* The spec-table pattern from item detail — hairline-divided rows in a
            single surface. A bare bulleted list read as unstyled text; this is
            the shape the design system already uses to present a set of facts. */}
        {/* Geometry is INLINE, not utility classes.
            A newly-added arbitrary value (`size-[32px]`, `text-[12px]/[1.3]`)
            silently failed to resolve here, collapsing the icon tile to nothing
            and leaving the description at an inherited size — the same class of
            failure that put the diary's day number in the middle of its cell.
            Inline styles land whatever the CSS pipeline does. */}
        <ul className="mt-4 overflow-hidden rounded-[14px] bg-surface-1 shadow-[inset_0_0_0_1px_var(--hairline-2)]">
          {PRO_BENEFITS.map(({ icon: Icon, label, desc }, i) => (
            <li
              key={label}
              className="flex items-center"
              style={{
                gap: 13,
                padding: "11px 14px",
                borderTop: i === 0 ? undefined : "1px solid var(--hairline-2)",
              }}
            >
              <span
                aria-hidden="true"
                className="grid shrink-0 place-items-center text-muted-foreground"
                style={{ width: 32, height: 32, borderRadius: 9, background: "var(--color-surface-3)" }}
              >
                <Icon size={15} strokeWidth={1.6} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-value" style={{ fontSize: 14, lineHeight: 1.25 }}>
                  {label}
                </span>
                <span
                  className="block text-muted-dim"
                  style={{ fontSize: 12, lineHeight: 1.3, marginTop: 1 }}
                >
                  {desc}
                </span>
              </span>
            </li>
          ))}
        </ul>

        {/* Inert: billing is a later phase, and a button that takes money it
            cannot take is worse than none. It states the price so the offer is
            complete; the purchase arrives with Stripe. */}
        {!isPro && (
          <div className="mt-5 grid min-h-[52px] w-full place-items-center rounded-[14px] bg-foreground text-[15.5px] font-semibold text-canvas">
            Go Pro · €5/mo
          </div>
        )}

        {/* A gate you cannot dismiss is a trap — but it must not crowd the
            primary either. At mt-2 the two read as one stuck-together block;
            the decline needs its own air to look like a real second option. */}
        <button
          type="button"
          onClick={onClose}
          className="mt-3 min-h-[44px] w-full text-[14px] text-muted-foreground"
        >
          {isPro ? "Close" : "Not now"}
        </button>
      </div>
    </>
  );
}
