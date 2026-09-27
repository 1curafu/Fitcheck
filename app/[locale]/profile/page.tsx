import { Suspense } from "react";
import { LinkRow } from "@/components/profile/profile-hub";
import { redirect } from "@/lib/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/shell/mobile-nav";
import { todayFor } from "@/lib/outfits/today";
import { currentStreak } from "@/lib/diary/streak";
import { initials, handleFrom, paletteFor } from "@/lib/profile/identity";
import { ProfileHub, type HubLink } from "@/components/profile/profile-hub";
import { entitlementsFor } from "@/lib/billing/tiers";
import { subscriptionFromRow } from "@/lib/billing/status-line";

/**
 * Rows are marked ready ONLY for routes that exist on `main` today.
 *
 * Two of the four bottom tabs used to 404 for exactly this reason (BUGS.md #5);
 * an unready row renders disabled with "Soon" rather than linking into nothing.
 */
const LINK_DEFS = [
  {
    href: "/style-dna",
    key: "styleDna",
    icon: "dna",
    ready: false,
  },
  {
    href: "/outfits",
    key: "savedOutfits",
    icon: "saved",
    ready: false,
  },
  {
    href: "/packing",
    key: "packing",
    icon: "saved",
    ready: true,
  },
  {
    href: "/stats",
    key: "stats",
    icon: "stats",
    ready: true,
  },
  {
    href: "/settings",
    key: "settings",
    icon: "settings",
    ready: true,
  },
] as const;

async function profileLinks(): Promise<HubLink[]> {
  const t = await getTranslations("profile.links");
  return LINK_DEFS.map(({ key, ...link }) => ({ ...link, label: t(`${key}.label`), desc: t(`${key}.description`) }));
}

/**
 * ⚠️ The profile has NO title in the design, so the shell must not invent one.
 * A first attempt put a "Profile" heading here; it painted instantly and then
 * VANISHED when the body arrived, because `ProfileHub` renders no such
 * heading — new UI nobody designed, which is exactly what this plan's Task 6
 * Step 3 warns against.
 *
 * What IS static on this screen is the link rows: their labels, descriptions
 * and readiness are the same for every user. Only the identity block and the
 * stat trio are personal, and those stream.
 */
function ProfileShell({ links }: { links: HubLink[] }) {
  return (
    <div className="screen-top px-[22px]">
      <div className="mt-[22px] flex flex-col gap-[10px]">
        {links.map((l) => (
          <LinkRow key={l.label} link={l} />
        ))}
      </div>
    </div>
  );
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ProfilePage({ searchParams }: { searchParams: SearchParams }) {
  const links = await profileLinks();
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      {/* The nav is the shell — identical for every user, so it prerenders
          and prefetches. Everything below needs the session — and the query
          string (`?pro=welcome` after Stripe Checkout), awaited inside it. */}
      <Suspense fallback={<ProfileShell links={links} />}>
        <ProfileBody searchParams={searchParams} />
      </Suspense>
      <MobileNav />
    </div>
  );
}

async function ProfileBody({ searchParams }: { searchParams: SearchParams }) {
  const t = await getTranslations("profile");
  const links = await profileLinks();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect({ href: "/", locale: await getLocale() });

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name, archetype, tier, location_timezone, subscription_status, subscription_interval, current_period_end, cancel_at_period_end",
    )
    .eq("id", user.id)
    .single();

  /**
   * `outfits` counts looks WORN, not looks generated.
   *
   * The `outfits` table holds every look the generator ever produced — three
   * per drop, plus styled looks, plus every past day — so a row count reports
   * the generator's output rather than anything the user did, and it inflates
   * on its own every day the app runs.
   */
  const [{ count: pieces }, { data: logs }] = await Promise.all([
    supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("archived", false),
    supabase.from("wear_logs").select("worn_on").eq("user_id", user.id),
  ]);

  const today = await todayFor(profile?.location_timezone);
  const wornDates = (logs ?? []).map((r) => r.worn_on);

  return (
    <ProfileHub
      name={profile?.display_name ?? t("you")}
      handle={handleFrom(user.email ?? "")}
      initials={initials(profile?.display_name ?? null, user.email ?? "")}
      archetype={profile?.archetype ?? null}
      palette={paletteFor(profile?.archetype ?? null)}
      tier={entitlementsFor(profile?.tier).tier}
      stats={{
        pieces: pieces ?? 0,
        outfits: wornDates.length,
        streak: currentStreak(wornDates, today),
      }}
      links={links}
      subscription={subscriptionFromRow(profile)}
      proNotice={(await searchParams).pro === "welcome" ? "welcome" : null}
    />
  );
}
