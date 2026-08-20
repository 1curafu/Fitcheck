import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingCapture } from "@/components/capture/onboarding-capture";

export default function OnboardingCapturePage() {
  // The session read is what blocks a shell, so it moves behind a boundary
  // and the route's chrome prerenders and prefetches without it.
  return (
    <Suspense fallback={null}>
      <CaptureBody />
    </Suspense>
  );
}

async function CaptureBody() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Seed the 5-slot strip from the user's existing item count (RLS scopes this to them).
  const { count } = await supabase
    .from("items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  return <OnboardingCapture initialCount={count ?? 0} />;
}
