"use client";

import { useState } from "react";
import Link from "next/link";
import { Kicker } from "@/components/ui-fitcheck/kicker";
import { UpgradeSheet } from "@/components/billing/upgrade-sheet";

/**
 * Wear Stats (Fitcheck.dc.html:737-780).
 *
 * Four sections: the headline trio, Most worn, Your biggest gap, Gathering
 * dust. The design's "See curated picks" CTA under the gap card is
 * DELIBERATELY absent — it leads to a shoppable/affiliate surface with no
 * product, legal or partner decision behind it anywhere in this project, and a
 * dead button is worse than no button.
 *
 * **The Pro line: facts are free, analysis is Pro** (user decision, 2026-08-17).
 * A free user sees their own closet value, total wears and average
 * cost-per-wear; Most worn, Gathering dust and the gap card sit behind the
 * upgrade sheet. That mirrors the rule already settled on item detail — a fact
 * about the piece in your hand is free, the screen that analyses the whole
 * wardrobe is Pro — and it is the only shape where the pitch is made with the
 * user's OWN numbers, which is `MONETISATION.md`'s entire argument for why
 * anyone pays in month three.
 */

export type StatRow = { id: string; name: string; sub: string };
export type DustRow = { id: string; name: string; days: number | null };
export type Gap = { label: string; unlocks: number; reason: string };

/** `days: null` means never worn — see `gatheringDust`. Never "∞ days ago". */
function idleLabel(days: number | null): string {
  if (days == null) return "Never worn";
  if (days === 0) return "Worn today";
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-[26px]">
      <Kicker>{title}</Kicker>
      <div className="mt-[11px]">{children}</div>
    </section>
  );
}

/**
 * A gated section names itself and stays tappable.
 *
 * The control is never a fence: nobody buys a feature they have never reached
 * for, so the sheet is the answer to the tap (the rule PR #25 established after
 * a muted caption read as a validation error).
 */
function LockedSection({
  title,
  pitch,
  onOpen,
}: {
  title: string;
  pitch: string;
  onOpen: (title: string) => void;
}) {
  return (
    <Section title={title}>
      <button
        type="button"
        aria-label={title}
        onClick={() => onOpen(title)}
        className="flex w-full items-center justify-between rounded-[14px] bg-surface-1 px-[15px] py-[15px] text-left shadow-[inset_0_0_0_1px_var(--hairline-2)]"
      >
        <span className="text-[13.5px] text-muted-foreground">{pitch}</span>
        <span className="text-[18px] text-muted-dim" aria-hidden="true">
          ›
        </span>
      </button>
    </Section>
  );
}

function ItemRow({ href, name, sub }: { href: string; name: string; sub: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between border-b border-[var(--hairline-2)] py-[13px] last:border-b-0"
    >
      <span className="text-[14.5px] text-value">{name}</span>
      <span className="text-[12.5px] text-muted-foreground">{sub}</span>
    </Link>
  );
}

export function StatsView({
  value,
  totalWears,
  avgCostPerWear,
  mostWorn,
  dust,
  gap,
  entitlements,
  isPro,
}: {
  value: string;
  totalWears: number;
  /** Null when nothing is priced or nothing is worn — the tile is HIDDEN, not zeroed. */
  avgCostPerWear: string | null;
  mostWorn: StatRow[];
  dust: DustRow[];
  gap: Gap | null;
  entitlements: { analytics: boolean; gapAnalysis: boolean };
  isPro: boolean;
}) {
  const [gateTitle, setGateTitle] = useState<string | null>(null);
  const empty = totalWears === 0;

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
        <h1 className="font-serif text-[30px] text-foreground">Wear Stats</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-[22px] pb-[120px] pt-[18px]">
      <div
        data-testid="stat-trio"
        className="flex overflow-hidden rounded-[14px] bg-surface-1 shadow-[inset_0_0_0_1px_var(--hairline-2)]"
      >
        <div className="flex-1 px-[6px] py-4 text-center">
          <div className="font-serif text-[24px] text-foreground">{value}</div>
          <div className="mt-[5px] text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Closet value
          </div>
        </div>
        <div className="flex-1 px-[6px] py-4 text-center">
          <div className="font-serif text-[24px] text-foreground">{totalWears}</div>
          <div className="mt-[5px] text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Total wears
          </div>
        </div>
        {/* Hidden rather than "€0.00": an average of an unpriced closet, or of
            zero wears, states something false. Same stance as `itemWearStats`. */}
        {avgCostPerWear && (
          <div className="flex-1 px-[6px] py-4 text-center">
            <div className="font-serif text-[24px] text-foreground">{avgCostPerWear}</div>
            <div className="mt-[5px] text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Cost per wear
            </div>
          </div>
        )}
      </div>

      {empty ? (
        <p className="mt-[26px] text-[14px] leading-[1.5] text-muted-foreground">
          Wear a look and log it, and this screen starts telling you what your wardrobe actually
          costs you.
        </p>
      ) : (
        <>
          {entitlements.analytics ? (
            <Section title="Most worn">
              {mostWorn.map((m) => (
                <ItemRow key={m.id} href={`/closet/${m.id}`} name={m.name} sub={m.sub} />
              ))}
            </Section>
          ) : (
            <LockedSection
              title="Most worn"
              pitch="See which pieces earn their place"
              onOpen={setGateTitle}
            />
          )}

          {entitlements.gapAnalysis ? (
            gap && (
              <Section title="Your biggest gap">
                <div className="rounded-[16px] bg-surface-1 p-5 shadow-[inset_0_0_0_1px_var(--hairline-2)]">
                  <div className="font-serif text-[24px] text-foreground">{gap.label}</div>
                  {/* The screen's single rust spend — the One Rust Rule. */}
                  <div className="mt-[6px] text-[13px] font-semibold text-brand">
                    Unlocks {gap.unlocks} new outfits
                  </div>
                  <p className="mt-[10px] text-[13.5px] leading-[1.5] text-muted-foreground">
                    {gap.reason}
                  </p>
                </div>
              </Section>
            )
          ) : (
            <LockedSection
              title="Your biggest gap"
              pitch="The one piece that unlocks the most"
              onOpen={setGateTitle}
            />
          )}

          {entitlements.analytics ? (
            <Section title="Gathering dust">
              {dust.map((d) => (
                <ItemRow
                  key={d.id}
                  href={`/closet/${d.id}`}
                  name={d.name}
                  sub={idleLabel(d.days)}
                />
              ))}
            </Section>
          ) : (
            <LockedSection
              title="Gathering dust"
              pitch="What you own and never reach for"
              onOpen={setGateTitle}
            />
          )}
        </>
      )}

        <UpgradeSheet
          open={gateTitle != null}
          title={gateTitle ?? ""}
          isPro={isPro}
          onClose={() => setGateTitle(null)}
        />
      </div>
    </div>
  );
}
