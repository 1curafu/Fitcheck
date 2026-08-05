import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/shell/mobile-nav";
import { localDateFor } from "@/lib/outfits/local-date";
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
  { href: "/style-dna", label: "Style DNA", desc: "Your archetype, shareable", icon: "dna", ready: false },
  { href: "/outfits", label: "Saved Outfits", desc: "Looks you kept", icon: "saved", ready: false },
  { href: "/stats", label: "Wear Stats", desc: "What you actually wear", icon: "stats", ready: false },
  { href: "/settings", label: "Settings", desc: "Preferences and account", icon: "settings", ready: false },
];

export default async function ProfilePage() {
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
    supabase.from("items").select("id", { count: "exact", head: true }).eq("archived", false),
    supabase.from("wear_logs").select("worn_on").eq("user_id", user.id),
  ]);

  const today = localDateFor(new Date(), profile?.location_timezone ?? "UTC");
  const wornDates = (logs ?? []).map((r) => r.worn_on);

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
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
      >
        {/* The design moves sign-out to Settings. Until that route exists this
            is the only way out of the app, and removing it would be a
            regression — it moves when Settings ships, not before. */}
        <form action="/auth/signout" method="post">
          <button className="w-full rounded-[14px] bg-surface-1 py-4 text-[15px] text-muted-foreground shadow-[inset_0_0_0_1px_var(--hairline-2)]">
            Sign out
          </button>
        </form>
      </ProfileHub>
      <MobileNav />
    </div>
  );
}
