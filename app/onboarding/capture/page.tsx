import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingCapture } from "@/components/capture/onboarding-capture";

export default async function OnboardingCapturePage() {
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
