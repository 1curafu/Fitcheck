import Link from "next/link";

/**
 * A screen's title bar — the part of a route that is identical for every user.
 *
 * ⚠️ This exists because of a measurement. After the Cache Components
 * migration, `/profile`, `/calendar` and `/stats` produced shells containing
 * **nothing but the bottom nav** — structurally correct, and useless: tapping
 * Profile showed an empty screen with a nav bar for 836ms while the body
 * streamed. `/closet` was the only route whose shell held anything, because it
 * was the only one where the header was deliberately hoisted out.
 *
 * A prefetched shell is only worth having if there is something IN it. Use this
 * in the page's shell AND as the `<Suspense>` fallback, so the header paints
 * instantly and does not move when the body arrives.
 */
export function ScreenHeader({
  title,
  backHref,
  kicker,
}: {
  title: string;
  /** Omit for a tab destination; a tab has no "back". */
  backHref?: string;
  /** Reserved above the title. Pass a space to hold the line while it loads. */
  kicker?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-[22px] screen-top">
      {backHref && (
        <Link
          href={backHref}
          aria-label="Back"
          className="grid size-[34px] shrink-0 place-items-center rounded-full bg-[#19181b] text-[18px] text-foreground shadow-[inset_0_0_0_1px_var(--hairline-5)]"
        >
          ‹
        </Link>
      )}
      <div>
        {kicker !== undefined && (
          <span className="block text-[10px] uppercase tracking-[0.22em] text-muted-dim">
            {kicker}
          </span>
        )}
        <h1 className="font-serif text-[30px] text-foreground">{title}</h1>
      </div>
    </div>
  );
}
