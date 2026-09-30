import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { ScreenHeader } from "@/components/shell/screen-header";
import { MobileNav } from "@/components/shell/mobile-nav";
import { StyleProfileEditor } from "@/components/settings/style-profile-editor";
import { redirect } from "@/lib/i18n/navigation";
import { readStyleProfile } from "@/lib/onboarding/style-profile";
import { createClient } from "@/lib/supabase/server";
import { updateStyleProfile } from "../actions";

/** The shell is the title bar only (Decision 6); the answers are the user's and stream in behind it. */
export default async function StyleProfilePage() {
  const t = await getTranslations("styleProfile");
  return (
    <Suspense fallback={<ScreenHeader title={t("title")} backHref="/settings" />}>
      <StyleProfileBody />
    </Suspense>
  );
}

async function StyleProfileBody() {
  const t = await getTranslations("styleProfile");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect({ href: "/sign-in", locale: await getLocale() });

  const { data: row } = await supabase
    .from("profiles")
    .select("archetype, palette, fit, dress_codes, occasions, nogos")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <ScreenHeader title={t("title")} backHref="/settings" />
      <StyleProfileEditor profile={readStyleProfile(row)} onSaveAction={updateStyleProfile} />
      <MobileNav />
    </div>
  );
}
