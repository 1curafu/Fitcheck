import { Kicker } from "@/components/ui-fitcheck/kicker";
import { PackingBack } from "./back-link";
import { WhyQuote } from "@/components/generate/why-quote";

export type Gap = { occasion: string; days: string[] };

/**
 * The closet cannot dress this trip.
 *
 * ⚠️ **A required state, not an error page.** This project has fixed "silently
 * returns nothing" three times (`personalBand`, outerwear, seasons) — and the
 * calibration proved this one is reachable from an ORDINARY closet at an
 * ordinary setting: "Fresh every day" leaves 3 of 7 days uncovered on 26 items.
 *
 * So it names what is missing and offers what it CAN build. Discovering the gap
 * at the airport is the worst possible version of this feature.
 */
export function Shortfall({
  destination,
  dateRange,
  gaps,
  coveredDays,
  totalDays,
  pieceCount,
  why,
  onBuildPartial,
}: {
  destination: string;
  dateRange: string;
  gaps: Gap[];
  coveredDays: number;
  totalDays: number;
  pieceCount: number;
  why: string;
  onBuildPartial: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <div className="screen-top flex-1 px-[22px]">
        <div className="mb-[10px] flex items-center gap-3">
          <PackingBack href="/packing" />
        </div>
        <Kicker className="block">{`${destination} · ${dateRange}`}</Kicker>
        <h1 className="mt-[14px] font-serif text-3xl/[1.12] tracking-[-0.01em] text-foreground-strong text-balance">
          Your closet can&rsquo;t dress this trip.
        </h1>
        <p className="mt-[10px] text-[15.5px] leading-[1.45] text-muted-foreground text-pretty">
          {describeGaps(gaps, totalDays - coveredDays)}
        </p>

        <Kicker className="mb-[9px] mt-[18px] block">What&rsquo;s missing</Kicker>
        <div className="flex flex-col gap-2">
          {gaps.map((g) => (
            <div
              key={g.occasion}
              className="rounded-[14px] bg-surface-1 px-[14px] py-3 shadow-[inset_0_0_0_1px_var(--hairline-3)]"
            >
              <div className="font-serif text-[18px]/[1.2] text-foreground">
                Something for {g.occasion}
              </div>
              <div className="mt-1 text-[13.5px] leading-[1.42] text-muted-foreground text-pretty">
                {g.days.length} day{g.days.length === 1 ? "" : "s"} — {g.days.join(", ")} — have
                nothing that fits.
              </div>
            </div>
          ))}
        </div>

        {/* What it CAN build. The rust-tinted surface is the one accent on this
            screen, per the One Rust Rule. */}
        <div className="mt-[18px] rounded-[16px] bg-surface-1 p-4 shadow-[inset_0_0_0_1px_rgba(184,106,71,0.20)]">
          <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-dna-camel">
            What it can build
          </div>
          <div className="mt-2 font-serif text-[20px]/[1.15] text-foreground">
            A {coveredDays}-day capsule.
          </div>
          <div className="mt-[15px] flex gap-2">
            {[
              [String(pieceCount), "Pieces"],
              [String(coveredDays), "Days"],
              [String(totalDays - coveredDays), "Uncovered"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="flex flex-1 flex-col rounded-[13px] bg-surface-1 p-[14px] shadow-[inset_0_0_0_1px_var(--hairline-2)]"
              >
                <div className="font-serif text-[15px] leading-none text-foreground">{value}</div>
                <div className="mt-auto pt-[6px] text-[10px] uppercase tracking-[0.1em] text-muted-dim">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <WhyQuote name={`${coveredDays} of ${totalDays} days`} why={why} />
      </div>

      <div className="sticky bottom-0 z-30 flex gap-3 bg-gradient-to-t from-canvas from-60% to-transparent px-[22px] pb-[calc(env(safe-area-inset-bottom)+14px)] pt-[14px]">
        {onBuildPartial}
      </div>
    </div>
  );
}

/** Plain language, naming the shape of the gap rather than counting failures. */
export function describeGaps(gaps: Gap[], uncovered: number): string {
  if (gaps.length === 0) return `${uncovered} days have nothing that fits.`;
  const names = gaps.map((g) => g.occasion);
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `You have nothing that works for ${list} — ${uncovered} day${
    uncovered === 1 ? "" : "s"
  } of this trip can't be dressed from your closet.`;
}
