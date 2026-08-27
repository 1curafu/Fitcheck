import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/shell/mobile-nav";
import { ScreenHeader } from "@/components/shell/screen-header";
import { TripSetup } from "@/components/packing/trip-setup";
import { resolveLocation } from "@/lib/weather/location";

/**
 * The shell: the title bar, which is identical for every user. Rendered as both
 * the shell and the `<Suspense>` fallback so nothing moves when the body lands.
 *
 * ⚠️ Do NOT invent UI for a shell. The Profile lesson: a title nobody designed
 * painted instantly and then vanished when the body arrived.
 */
function PackingShell() {
  return <ScreenHeader title="Where are you going?" kicker="Packing mode" backHref="/profile" />;
}

export default function PackingPage() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <Suspense fallback={<PackingShell />}>
        <PackingBody />
      </Suspense>
      <MobileNav />
    </div>
  );
}

async function PackingBody() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("location_label, location_lat, location_lon, location_timezone, location_source")
    .eq("id", user.id)
    .maybeSingle();

  // The destination defaults to the user's saved location — most trips start
  // from "somewhere else", but a sensible pre-fill beats an empty field.
  const location = resolveLocation({ profile: profile ?? null });

  // ⚠️ `timezone` is not part of `ResolvedLocation` — it exists only as a
  // by-product of a forecast fetch (the constraint the location-in-settings
  // plan recorded). The profile's stored value is the best we have, and the
  // trip stores whatever it was planned with.
  const timezone = profile?.location_timezone ?? "UTC";

  return (
    <TripSetup
      destinationLabel={location.label}
      lat={location.lat}
      lon={location.lon}
      timezone={timezone}
      onLocate={location.label}
    />
  );
}
