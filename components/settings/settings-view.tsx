"use client";

import { useState } from "react";
import Link from "next/link";
import type { Preferences } from "@/lib/profile/preferences";

const CARD =
  "rounded-[14px] bg-surface-1 shadow-[inset_0_0_0_1px_var(--hairline-2)]";

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 mt-6 text-[11px] uppercase tracking-[0.2em] text-muted-dim">{children}</div>
  );
}

/**
 * Track and knob geometry are INLINE styles, not arbitrary-value utilities.
 *
 * `size-[32px]`, `text-[12px]/[1.3]` and `bottom-[6px]` have all silently failed
 * to resolve in this project — the element collapses to content size with no CSS
 * error anywhere (docs/STATE.md records three occurrences). A switch whose track
 * collapses is not a switch, so its geometry does not go through that path.
 */
function Toggle({
  label,
  desc,
  checked,
  onChange,
  last = false,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: () => void;
  last?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-[14px] px-4 py-[15px]"
      style={last ? undefined : { borderBottom: "1px solid var(--hairline-2)" }}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] text-foreground">{label}</div>
        <div className="mt-[2px] text-[12px] text-muted-foreground">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className="relative shrink-0 rounded-full transition-colors"
        style={{
          width: 44,
          height: 26,
          background: checked ? "var(--color-brand)" : "#2a282c",
        }}
      >
        <span
          className="absolute rounded-full transition-transform"
          style={{
            top: 3,
            left: 0,
            width: 20,
            height: 20,
            background: "var(--color-foreground)",
            transform: `translateX(${checked ? 21 : 3}px)`,
          }}
        />
      </button>
    </div>
  );
}

/**
 * `Fitcheck.dc.html:782-821`, with two deliberate divergences from it.
 *
 * 1. **No Pro banner** (`:794`). The profile hub already owns the single Pro
 *    entry point, and it opens the shared `UpgradeSheet` — two cards on two
 *    screens can drift into disagreeing about what Pro is, which is the reason
 *    that sheet is shared in the first place.
 * 2. **No chevron on the account row** (`:791`). The design's `›` implies an
 *    account detail screen that does not exist. Two bottom-nav tabs used to 404
 *    for exactly this reason (BUGS.md #5).
 *
 * The design's four toggles become two. Rain guard and metric units both change
 * real behaviour in the same PR that ships them. The daily fit reminder needs
 * web-push — no service worker, VAPID keys or scheduler exist — so it ships with
 * the notifications plan rather than as a switch that schedules nothing.
 */
export function SettingsView({
  name,
  email,
  initials,
  locationLabel,
  preferences,
  onSaveAction,
}: {
  name: string;
  email: string;
  initials: string;
  locationLabel: string | null;
  preferences: Preferences;
  onSaveAction: (patch: Partial<Preferences>) => Promise<void>;
}) {
  const [prefs, setPrefs] = useState(preferences);
  const [error, setError] = useState<string | null>(null);

  /**
   * Optimistic, and reverted on failure.
   *
   * A switch that waits for a round trip before moving reads as broken; a switch
   * that moves and stays moved after a failed write is worse, because the screen
   * then disagrees with the database and only a refresh reveals it.
   */
  async function patch(next: Partial<Preferences>) {
    const previous = prefs;
    setPrefs({ ...prefs, ...next });
    setError(null);
    try {
      await onSaveAction(next);
    } catch {
      setPrefs(previous);
      setError("Couldn't save that — check your connection.");
    }
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <div className="flex items-center gap-3 px-[22px] screen-top">
        <Link
          href="/profile"
          aria-label="Back"
          className="grid size-[34px] shrink-0 place-items-center rounded-full bg-[#19181b] text-[18px] text-foreground shadow-[inset_0_0_0_1px_var(--hairline-5)]"
        >
          ‹
        </Link>
        <h1 className="font-serif text-[30px] text-foreground">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-[22px] pb-[120px] pt-[18px]">
        <div className={`${CARD} flex items-center gap-[14px] px-4 py-[15px]`}>
          <div className="grid size-[50px] shrink-0 place-items-center rounded-full font-serif text-[18px] text-value shadow-[inset_0_0_0_1px_var(--hairline-6)] [background:linear-gradient(150deg,#2a2622,#191518)]">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[16px] text-foreground">{name}</div>
            <div className="mt-[2px] truncate text-[12.5px] text-muted-foreground">{email}</div>
          </div>
        </div>

        <Kicker>Preferences</Kicker>
        <div className={`${CARD} overflow-hidden`}>
          <Toggle
            label="Rain guard"
            desc="Never suede or canvas when it rains"
            checked={prefs.rainGuard}
            onChange={() => patch({ rainGuard: !prefs.rainGuard })}
          />
          <Toggle
            label="Metric units"
            desc="Temperatures in °C rather than °F"
            checked={prefs.tempUnit === "C"}
            onChange={() => patch({ tempUnit: prefs.tempUnit === "C" ? "F" : "C" })}
            last
          />
        </div>

        {error && (
          <p role="status" className="mt-3 text-[12.5px] text-brand-high">
            {error}
          </p>
        )}

        <Kicker>Language</Kicker>
        <div className="flex gap-1 rounded-full bg-surface-1 p-1 shadow-[inset_0_0_0_1px_var(--hairline-3)]">
          <button
            type="button"
            aria-pressed="true"
            className="flex-1 rounded-full bg-foreground py-[10px] text-center text-[13px] font-semibold text-canvas"
          >
            English
          </button>
          {/* next-intl is deferred, so DE is rendered and disabled rather than
              offered. Disabled — not merely styled — so it is unreachable by
              keyboard too. */}
          <button
            type="button"
            disabled
            className="flex-1 rounded-full py-[10px] text-center text-[13px] font-semibold text-muted-dim"
          >
            Deutsch <span className="text-[10px] uppercase tracking-[0.14em]">Soon</span>
          </button>
        </div>

        <div
          data-testid="location-row"
          className={`${CARD} mt-3 flex items-center justify-between p-4`}
        >
          <div className="text-[14.5px] text-foreground">Location</div>
          <div className="text-[13.5px] text-muted-foreground">{locationLabel ?? "Not set"}</div>
        </div>

        <form action="/auth/signout" method="post" className="mt-6">
          <button
            type="submit"
            className="w-full rounded-[14px] p-4 text-center text-[14px] font-semibold text-brand shadow-[inset_0_0_0_1px_rgba(184,106,71,0.25)]"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
