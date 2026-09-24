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
import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { startCheckout, type StartCheckoutResult } from "@/app/billing/actions";
import { Kicker } from "@/components/ui-fitcheck/kicker";
import { displayPrice, monthlyEquivalent, type Interval } from "@/lib/billing/prices";
import { cn } from "@/lib/utils";

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
  timeZone,
}: {
  open: boolean;
  /** What the user just tried to do, in their words. */
  title: string;
  /** The seam's own reason, when opened from a gate. Never re-worded here. */
  body?: string;
  /** A subscriber gets the same list as a receipt, never a sales pitch. */
  isPro?: boolean;
  onClose: () => void;
  /** Display currency only; defaults to the device's time zone. Checkout decides the real currency. */
  timeZone?: string;
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
        className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-[22px] border-t border-[rgba(237,230,216,0.12)] bg-surface-2 px-[22px] pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3.5"
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

        {!isPro && <ProPurchase timeZone={timeZone} />}

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

const PURCHASE_MESSAGES: Record<StartCheckoutResult["status"], string> = {
  "waiver-required": "Please confirm you want Pro to start now.",
  "already-pro": "You're already Pro — manage it from your profile.",
  "signed-out": "Please sign in again.",
  unavailable: "Pro isn't available right now.",
  error: "Couldn't start checkout. Try again in a moment.",
};

/** The price in the buyer's currency — display only; Stripe Checkout charges the real local currency. */
export function proPriceLabel(interval: Interval, timeZone?: string) {
  return displayPrice(interval, timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
}

/**
 * The purchase block (spec §8). While billing is off (NEXT_PUBLIC_BILLING_ENABLED unset: CI, local, before launch)
 * it stays the inert price pill — a button that takes money it cannot take is worse than none.
 */
function ProPurchase({ timeZone }: { timeZone?: string }) {
  const tz = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [plan, setPlan] = useState<Interval>("year");
  const [waiver, setWaiver] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const converted = displayPrice("month", tz).converted;

  if (process.env.NEXT_PUBLIC_BILLING_ENABLED !== "1") {
    return (
      <div className="mt-5 grid min-h-[52px] w-full place-items-center rounded-[14px] bg-foreground text-[15.5px] font-semibold text-canvas">
        Go Pro · {displayPrice("month", tz).label}
      </div>
    );
  }

  const PLANS: Array<{ id: Interval; name: string; hint: string | null }> = [
    { id: "year", name: "Annual", hint: `2 months free · ${monthlyEquivalent(tz)}` },
    { id: "month", name: "Monthly", hint: null },
  ];

  return (
    <div className="mt-5">
      {/* Plan rows in the same hairline surface as the benefits list — a menu, not a toggle (owner, 2026-09-24).
          Real radio inputs, so the group is keyboard- and screen-reader-native. */}
      <fieldset className="overflow-hidden rounded-[14px] bg-surface-1 shadow-[inset_0_0_0_1px_var(--hairline-2)]">
        <legend className="sr-only">Billing interval</legend>
        {PLANS.map((p, i) => {
          const selected = plan === p.id;
          return (
            <label
              key={p.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 px-4 py-3",
                i > 0 && "border-t border-[var(--hairline-2)]",
                selected && "shadow-[inset_0_0_0_1.5px_var(--color-foreground)]",
              )}
            >
              <input
                type="radio"
                name="pro-plan"
                value={p.id}
                checked={selected}
                onChange={() => setPlan(p.id)}
                aria-label={p.name}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-[18px] shrink-0 place-items-center rounded-full border",
                  selected ? "border-foreground" : "border-muted-dim",
                )}
              >
                {selected && <span className="size-[9px] rounded-full bg-foreground" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] text-foreground">{p.name}</span>
                {p.hint && <span className="block text-[12px] text-muted-dim">{p.hint}</span>}
              </span>
              <span className="text-[14px] text-value">{displayPrice(p.id, tz).label}</span>
            </label>
          );
        })}
      </fieldset>
      {converted && (
        <p className="mt-2 text-center text-[12px] text-muted-dim">Charged in your local currency at checkout.</p>
      )}

      {/* EU withdrawal waiver (spec §8): distinct, unticked by default, required server-side too. A drawn box in the
          app's cream, not the platform's blue default. */}
      <label className="mt-4 flex cursor-pointer items-start gap-3 text-[13px]/[1.4] text-muted-foreground">
        <input
          type="checkbox"
          checked={waiver}
          onChange={(e) => setWaiver(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 grid size-5 shrink-0 place-items-center rounded-[6px] border peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-foreground",
            waiver ? "border-foreground bg-foreground text-canvas" : "border-muted-dim",
          )}
        >
          {waiver && <Check size={14} strokeWidth={2.4} />}
        </span>
        <span>Start Pro now. I understand I lose my 14-day right of withdrawal once it starts.</span>
      </label>

      <button
        type="button"
        disabled={!waiver || pending}
        onClick={() =>
          start(async () => {
            setError(null);
            // Success redirects to Stripe Checkout; a returned result is an outcome to explain.
            const result = await startCheckout({ interval: plan, waiverAccepted: waiver });
            if (result) setError(PURCHASE_MESSAGES[result.status] ?? PURCHASE_MESSAGES.error);
          })
        }
        className="mt-4 grid min-h-[52px] w-full place-items-center rounded-[14px] bg-foreground text-[15.5px] font-semibold text-canvas disabled:opacity-40"
      >
        {pending ? "Opening checkout…" : "Go Pro"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-center text-[13px] text-muted-foreground">
          {error}
        </p>
      )}

      <p className="mt-3 text-center text-[11.5px]/[1.45] text-muted-dim">
        Payments processed by Stripe · sold through Link. Renews automatically — cancel any time in the app.{" "}
        <a href="/terms" className="underline underline-offset-2">
          Terms
        </a>
        {" · "}
        <a href="/privacy" className="underline underline-offset-2">
          Privacy
        </a>
      </p>
    </div>
  );
}
