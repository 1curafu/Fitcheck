import { Suspense } from "react";
import { ScreenHeader } from "@/components/shell/screen-header";
import { redirect } from "@/lib/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/shell/mobile-nav";
import { initials } from "@/lib/profile/identity";
import { readPreferences } from "@/lib/profile/preferences";
import { resolveLocation } from "@/lib/weather/location";
import { SettingsView } from "@/components/settings/settings-view";
import { subscriptionFromRow } from "@/lib/billing/status-line";
import { listMine } from "@/lib/share/store";
import { deleteAccount, updatePreferences, setLocation, stopSharedLink } from "./actions";

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  // The session read is what blocks a shell, so it moves behind a boundary
  // and the route's chrome prerenders and prefetches without it.
  return (
    <Suspense fallback={<ScreenHeader title={t("title")} backHref="/profile" />}>
      <SettingsBody />
    </Suspense>
  );
}

async function SettingsBody() {
  const tProfile = await getTranslations("profile");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect({ href: "/sign-in", locale: await getLocale() });

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name, location_label, location_lat, location_lon, location_source, preferences, tier, subscription_status, subscription_interval, current_period_end, cancel_at_period_end",
    )
    .eq("id", user.id)
    .single();

  // The EFFECTIVE location, not the stored column. A null `location_label`
  // used to render "Not set" here while the Stylist screen was happily showing
  // Berlin — two screens describing the same thing differently. resolveLocation
  // is the same function the generator uses, so they cannot disagree.
  const location = resolveLocation({ profile });
  const sharedLinks = await listMine(supabase);

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SettingsView
        name={profile?.display_name ?? tProfile("you")}
        email={user.email ?? ""}
        initials={initials(profile?.display_name ?? null, user.email ?? "")}
        locationLabel={location.label}
        preferences={readPreferences(profile?.preferences)}
        onSaveAction={updatePreferences}
        onSetLocationAction={setLocation}
        onDeleteAction={deleteAccount}
        subscription={subscriptionFromRow(profile)}
        sharedLinks={sharedLinks}
        onStopSharedLinkAction={stopSharedLink}
      />
      <MobileNav />
    </div>
  );
}
