import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/shell/mobile-nav";
import { Stylist } from "@/components/generate/stylist";
import { WearConfirm } from "@/components/outfits/wear-confirm";
import { hourFor, todayFor } from "@/lib/outfits/today";
import { readPreferences } from "@/lib/profile/preferences";
import { shouldAsk } from "@/lib/outfits/confirm";

export default function GeneratePage() {
  return (
    // No bottom padding: the sticky nav occupies its own space in flow at the
    // end of the page, so nothing sits under it. The old pb-[76px] was both
    // unnecessary and 31px short of the nav's actual height.
    <div className="flex min-h-dvh flex-1 flex-col">
      {/* `Stylist` is a client component that reads `useSearchParams` (the
          occasion and look index live in the URL, PR #21). ⚠️ Under Cache
          Components that hook ALWAYS needs a Suspense boundary — search params
          are only known at request time — so it gets its own, separate from the
          wear-confirmation read below. */}
      <Suspense fallback={null}>
        <Stylist />
      </Suspense>
      <Suspense fallback={null}>
        <EveningConfirm />
      </Suspense>
      <MobileNav />
    </div>
  );
}

async function EveningConfirm() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  /**
   * The evening wear confirmation.
   *
   * Mounted HERE rather than in `MobileShell` because this is the app's home
   * tab and the screen a returning user lands on. In the shell it would fire
   * mid-capture and mid-edit, which is where an interruption costs most.
   *
   * The decision is made server-side so it cannot depend on the device clock,
   * and the hour is the user's LOCAL one — a UTC hour would roll the question
   * into the afternoon for eastern users, the failure Decision 5 exists to
   * prevent.
   */
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferences, location_timezone")
    .eq("id", user.id)
    .single();

  const tz = profile?.location_timezone ?? "UTC";
  const today = await todayFor(tz);

  const [{ data: viewed }, { data: worn }] = await Promise.all([
    supabase
      .from("outfits")
      .select("id, look_name, viewed_at")
      .eq("user_id", user.id)
      .eq("generated_on", today)
      .not("viewed_at", "is", null),
    supabase
      .from("wear_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("worn_on", today)
      .limit(1),
  ]);

  const confirm = shouldAsk({
    nowLocalHour: await hourFor(tz),
    today,
    askedOn: readPreferences(profile?.preferences).wearAskedOn,
    hasWearToday: Boolean(worn?.length),
    viewedToday: (viewed ?? []).map((o) => ({
      id: o.id,
      lookName: o.look_name ?? "today's look",
      viewedAt: o.viewed_at as string,
    })),
  });

  if (!confirm.ask) return null;
  return (
    <WearConfirm outfitId={confirm.outfitId} lookName={confirm.lookName} />
  );
}
