import { Suspense } from "react";
import { LinkRow } from "@/components/profile/profile-hub";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/shell/mobile-nav";
import { todayFor } from "@/lib/outfits/today";
import { currentStreak } from "@/lib/diary/streak";
import { initials, handleFrom, paletteFor } from "@/lib/profile/identity";
import { ProfileHub, type HubLink } from "@/components/profile/profile-hub";
import { entitlementsFor } from "@/lib/billing/tiers";

/**
 * Rows are marked ready ONLY for routes that exist on `main` today.
 *
 * Two of the four bottom tabs used to 404 for exactly this reason (BUGS.md #5);
 * an unready row renders disabled with "Soon" rather than linking into nothing.
 */
const LINKS: HubLink[] = [
  {
    href: "/style-dna",
    label: "Style DNA",
    desc: "Your archetype, shareable",
    icon: "dna",
    ready: false,
  },
  {
    href: "/outfits",
    label: "Saved Outfits",
    desc: "Looks you kept",
    icon: "saved",
    ready: false,
  },
  {
    href: "/packing",
    label: "Packing Mode",
    desc: "The smallest case that dresses the trip",
    icon: "saved",
    ready: true,
  },
  {
    href: "/stats",
    label: "Wear Stats",
    desc: "What you actually wear",
    icon: "stats",
    ready: true,
  },
  {
    href: "/settings",
    label: "Settings",
    desc: "Preferences and account",
    icon: "settings",
    ready: true,
  },
];

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
function ProfileShell() {
  return (
    <div className="screen-top px-[22px]">
      <div className="mt-[22px] flex flex-col gap-[10px]">
        {LINKS.map((l) => (
          <LinkRow key={l.label} link={l} />
        ))}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      {/* The nav is the shell — identical for every user, so it prerenders
          and prefetches. Everything below needs the session. */}
      <Suspense fallback={<ProfileShell />}>
        <ProfileBody />
      </Suspense>
      <MobileNav />
    </div>
  );
}

async function ProfileBody() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, archetype, tier, location_timezone")
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
      name={profile?.display_name ?? "You"}
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
      links={LINKS}
    />
  );
}
