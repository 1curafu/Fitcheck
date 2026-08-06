import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/shell/mobile-nav";
import { initials } from "@/lib/profile/identity";
import { readPreferences } from "@/lib/profile/preferences";
import { SettingsView } from "@/components/settings/settings-view";
import { updatePreferences } from "./actions";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, location_label, preferences")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SettingsView
        name={profile?.display_name ?? "You"}
        email={user.email ?? ""}
        initials={initials(profile?.display_name ?? null, user.email ?? "")}
        locationLabel={profile?.location_label ?? null}
        preferences={readPreferences(profile?.preferences)}
        onSaveAction={updatePreferences}
      />
      <MobileNav />
    </div>
  );
}
