import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PackingBack } from "@/components/packing/back-link";
import { TripSetup } from "@/components/packing/trip-setup";
import { resolveLocation } from "@/lib/weather/location";

/**
 * The shell, and the `<Suspense>` fallback — the back control and the title,
 * both of which are identical for every user, in the same place the body puts
 * them, so nothing moves when the body lands.
 */
function PackingShell() {
  return (
    <div className="screen-top px-[22px]">
      <PackingBack href="/profile" />
      <span className="mt-[10px] block text-[11px] uppercase tracking-[0.22em] text-muted-dim">
        Packing mode
      </span>
      <h1 className="mt-[13px] font-serif text-3xl/[1.12] tracking-[-0.01em] text-foreground-strong">
        Where are you going?
      </h1>
    </div>
  );
}

export default function PackingPage() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <Suspense fallback={<PackingShell />}>
        <PackingBody />
      </Suspense>
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
    />
  );
}
