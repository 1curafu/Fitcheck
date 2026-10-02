"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/lib/i18n/navigation";
import { Kicker } from "@/components/ui-fitcheck/kicker";
import { UpgradeSheet } from "@/components/billing/upgrade-sheet";
import { Surface } from "@/components/ui-fitcheck/surface";
import { colorHex, type ColorName } from "@/lib/closet/vocab";
import type { AdvisorPieceKey } from "@/lib/stats/advisor";

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
/**
 * `share` — the proportional increase — NOT a raw count.
 *
 * Measured on the 21-item dev closet, the count came out at 258, which is
 * arithmetically exact and completely uncredible; the design's own example was
 * 14. Worse, the count scales with parameters we invented (four occasions, two
 * simulated conditions), so adding a cold pass doubled it overnight for an
 * unchanged wardrobe. A number that moves when an internal constant changes
 * cannot be defended to a customer. See `lib/stats/gap.ts`.
 */
export type Gap = { label: string; share: number | null; reason: string };
export type Advice = { read: string; purchases: { label: AdvisorPieceKey; colorKey: ColorName; pairsWith: number; partners: string[] }[] };

/**
 * The claim, in plain words.
 *
 * Rounded to whole percent and floored at 1: "adds 0% more outfits" is a
 * sentence that argues against itself, and a piece that genuinely moves nothing
 * never reaches this card (`biggestGap` only reports a positive unlock).
 */
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
  advisor = null,
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
  advisor?: Advice | null;
  entitlements: { analytics: boolean; gapAnalysis: boolean };
  isPro: boolean;
}) {
  const t = useTranslations("stats");
  const vocab = useTranslations("vocab.color");
  const [gateTitle, setGateTitle] = useState<string | null>(null);
  const empty = totalWears === 0;
  const sharePhrase = (share: number | null) => share == null
    ? t("shareMissing") : t("shareAdds", { pct: Math.max(1, Math.round(share * 100)) });
  const idleLabel = (days: number | null) => days == null ? t("neverWorn")
    : days === 0 ? t("wornToday") : t("daysAgo", { days });

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <div className="flex items-center gap-3 px-[22px] screen-top">
        <Link
          href="/profile"
          aria-label={t("back")}
          className="grid size-[34px] shrink-0 place-items-center rounded-full bg-[#19181b] text-[18px] text-foreground shadow-[inset_0_0_0_1px_var(--hairline-5)]"
        >
          ‹
        </Link>
        <h1 className="font-serif text-[30px] text-foreground">{t("title")}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-[22px] pb-[120px] pt-[18px]">
      <div
        data-testid="stat-trio"
        className="flex overflow-hidden rounded-[14px] bg-surface-1 shadow-[inset_0_0_0_1px_var(--hairline-2)]"
      >
        <div className="flex-1 px-[6px] py-4 text-center">
          <div className="font-serif text-[24px] text-foreground">{value}</div>
          <div className="mt-[5px] text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("closetValue")}
          </div>
        </div>
        <div className="flex-1 px-[6px] py-4 text-center">
          <div className="font-serif text-[24px] text-foreground">{totalWears}</div>
          <div className="mt-[5px] text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("totalWears")}
          </div>
        </div>
        {/* Hidden rather than "€0.00": an average of an unpriced closet, or of
            zero wears, states something false. Same stance as `itemWearStats`. */}
        {avgCostPerWear && (
          <div className="flex-1 px-[6px] py-4 text-center">
            <div className="font-serif text-[24px] text-foreground">{avgCostPerWear}</div>
            <div className="mt-[5px] text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t("costPerWear")}
            </div>
          </div>
        )}
      </div>

      {empty ? (
        <p className="mt-[26px] text-[14px] leading-[1.5] text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <>
          {entitlements.analytics ? (
            <Section title={t("mostWorn")}>
              {mostWorn.map((m) => (
                <ItemRow key={m.id} href={`/closet/${m.id}`} name={m.name} sub={m.sub} />
              ))}
            </Section>
          ) : (
            <LockedSection
              title={t("mostWorn")}
              pitch={t("mostWornPitch")}
              onOpen={setGateTitle}
            />
          )}

          {entitlements.gapAnalysis ? (
            advisor?.purchases.length ? (
              <Section title={t("whatToBuy")}>
                <p className="mb-3 text-[13.5px] leading-[1.5] text-muted-foreground">{advisor.read}</p>
                <div className="space-y-3">
                  {advisor.purchases.map((purchase) => (
                    <Surface key={`${purchase.label}|${purchase.colorKey}`} data-testid="advisor-card" className="p-5">
                      <div className="font-serif text-[24px] text-foreground">{t(`advisorPieces.${purchase.label}`)}</div>
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[12.5px] text-foreground">
                        <span aria-hidden="true" className="size-3 rounded-full border border-foreground/20" style={{ backgroundColor: colorHex(purchase.colorKey) }} />
                        {vocab(purchase.colorKey)}
                      </div>
                      <div className="mt-[10px] text-[13px] font-semibold text-brand">{t("goesWith", { n: purchase.pairsWith })}</div>
                      <p className="mt-[10px] text-[13.5px] leading-[1.5] text-muted-foreground">
                        {purchase.partners.length > 1
                          ? t("bestWith", { a: purchase.partners[0], b: purchase.partners[1] })
                          : t("bestWithOne", { a: purchase.partners[0] })}
                      </p>
                    </Surface>
                  ))}
                </div>
              </Section>
            ) : gap && (
              <Section title={t("biggestGap")}>
                <div className="rounded-[16px] bg-surface-1 p-5 shadow-[inset_0_0_0_1px_var(--hairline-2)]">
                  <div className="font-serif text-[24px] text-foreground">{gap.label}</div>
                  {/* The screen's single rust spend — the One Rust Rule. */}
                  <div className="mt-[6px] text-[13px] font-semibold text-brand">
                    {sharePhrase(gap.share)}
                  </div>
                  <p className="mt-[10px] text-[13.5px] leading-[1.5] text-muted-foreground">
                    {gap.reason}
                  </p>
                </div>
              </Section>
            )
          ) : (
            <LockedSection
              title={t("whatToBuy")}
              pitch={t("whatToBuyPitch")}
              onOpen={setGateTitle}
            />
          )}

          {entitlements.analytics ? (
            <Section title={t("gatheringDust")}>
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
              title={t("gatheringDust")}
              pitch={t("gatheringDustPitch")}
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
