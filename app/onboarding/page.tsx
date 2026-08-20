import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Quiz } from "@/components/onboarding/quiz";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", user.id)
    .single();
  if (profile?.onboarded_at) redirect("/closet");

  return <Quiz />;
}
