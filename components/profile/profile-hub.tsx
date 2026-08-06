import Link from "next/link";
import { Fingerprint, Bookmark, ChartColumn, Settings } from "lucide-react";
import { ProCard } from "@/components/billing/pro-card";
import type { Tier } from "@/lib/billing/tiers";

/**
 * Icons are named by a string id, not passed as elements.
 *
 * Handing JSX across the RSC boundary earns a React key warning — a serialised
 * element has no positional identity — which is the trap `page.tsx` already hit
 * once passing `<StyleCta/>` into `ItemDetail`. A string keeps the route's data
 * serialisable and the mapping here, next to the markup that uses it.
 */
const ICONS = {
  dna: Fingerprint,
  saved: Bookmark,
  stats: ChartColumn,
  settings: Settings,
} as const;

export type HubLink = {
  href: string;
  label: string;
  desc: string;
  icon: keyof typeof ICONS;
  /** False until the destination exists on `main`. */
  ready: boolean;
};

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 px-[6px] py-4 text-center">
      <div className="font-serif text-[24px] text-foreground">{value}</div>
      <div className="mt-[5px] text-[10px] uppercase tracking-[0.1em] text-muted-dim">{label}</div>
    </div>
  );
}

function LinkRow({ link }: { link: HubLink }) {
  const Icon = ICONS[link.icon];
  const body = (
    <>
      <div
        className="grid size-[38px] shrink-0 place-items-center rounded-[10px] bg-[#201b18] text-muted-foreground"
        aria-hidden="true"
      >
        <Icon size={17} strokeWidth={1.6} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] text-foreground">{link.label}</div>
        <div className="mt-[2px] text-[12px] text-muted-foreground">{link.desc}</div>
      </div>
      {link.ready ? (
        <span className="text-[20px] text-muted-dim" aria-hidden="true">
          ›
        </span>
      ) : (
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-dim">Soon</span>
      )}
    </>
  );

  const shell =
    "flex items-center gap-[14px] rounded-[14px] bg-surface-1 px-4 py-[15px] shadow-[inset_0_0_0_1px_var(--hairline-2)]";

  // An unready row is NOT a link. Two of the four bottom tabs used to 404 for
  // exactly this reason (BUGS.md #5); it should not repeat one level down.
  return link.ready ? (
    <Link href={link.href} className={shell}>
      {body}
    </Link>
  ) : (
    <div className={`${shell} opacity-60`}>{body}</div>
  );
}

/**
 * The profile hub (`Fitcheck.dc.html:659-702`).
 *
 * Presentational: every count is computed by the route.
 */
export function ProfileHub({
  name,
  handle,
  initials,
  archetype,
  palette,
  tier,
  stats,
  links,
}: {
  name: string;
  handle: string;
  initials: string;
  archetype: string | null;
  palette: string[];
  tier: Tier;
  /** `outfits` is looks WORN, not looks generated — see the route. */
  stats: { pieces: number; outfits: number; streak: number };
  links: HubLink[];
}) {
  return (
    <div className="flex-1 overflow-y-auto px-[22px] pb-[120px] screen-top">
      <div className="flex items-center gap-[14px]">
        <div className="grid size-[62px] shrink-0 place-items-center rounded-full font-serif text-[22px] text-value shadow-[inset_0_0_0_1px_var(--hairline-6)] [background:linear-gradient(150deg,#2a2622,#191518)]">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-[25px]/[1] text-foreground">{name}</h1>
          <p className="mt-[5px] text-[13px] text-muted-foreground">{handle}</p>
        </div>
      </div>

      {/* The closet cap is deliberately absent. Same reasoning as the reroll
          meter: a visible allowance makes a free user think about the limit
          constantly, and 50 is far enough out that most never approach it. */}
      <div
        data-testid="stat-trio"
        className="mt-[22px] flex overflow-hidden rounded-[14px] bg-surface-1 shadow-[inset_0_0_0_1px_var(--hairline-2)]"
      >
        <StatCell value={String(stats.pieces)} label="Pieces" />
        <StatCell value={String(stats.outfits)} label="Outfits worn" />
        <StatCell value={String(stats.streak)} label="Day streak" />
      </div>

      <Link
        href="/style-dna"
        className="relative mt-[13px] block overflow-hidden rounded-[16px] p-5 shadow-[inset_0_0_0_1px_rgba(184,106,71,0.18)] [background:radial-gradient(120%_120%_at_82%_8%,#241d18,#161517)]"
      >
        <span className="text-[10px] uppercase tracking-[0.22em] text-[#b89a6a]">Your archetype</span>
        <div className="mt-[6px] font-serif text-[30px] text-foreground">
          {archetype ?? "Not set yet"}
        </div>
        <div className="mt-[14px] flex gap-[5px]">
          {palette.map((c) => (
            <div
              key={c}
              className="size-[30px] rounded-[7px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]"
              style={{ background: c }}
            />
          ))}
        </div>
        <span className="absolute right-[18px] top-6 text-[20px] text-muted-dim" aria-hidden="true">
          ›
        </span>
      </Link>

      <div className="mt-[13px] flex flex-col gap-[10px]">
        {links.map((l) => (
          <LinkRow key={l.label} link={l} />
        ))}
      </div>

      <ProCard tier={tier} />
    </div>
  );
}
