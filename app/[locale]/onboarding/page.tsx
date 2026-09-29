import { Suspense } from "react";
import { redirect } from "@/lib/i18n/navigation";
import { getLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { Quiz } from "@/components/onboarding/quiz";

export default function OnboardingPage() {
  // The session read is what blocks a shell, so it moves behind a boundary
  // and the route's chrome prerenders and prefetches without it.
  return (
    <Suspense fallback={null}>
      <OnboardingBody />
    </Suspense>
  );
}

async function OnboardingBody() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect({ href: "/", locale: await getLocale() });

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", user.id)
    .single();
  if (profile?.onboarded_at) return redirect({ href: "/closet", locale: await getLocale() });

  return <Quiz />;
}
