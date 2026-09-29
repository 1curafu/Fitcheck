import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ExampleSection } from "@/components/landing/example-section";
import { Features } from "@/components/landing/features";
import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Plans } from "@/components/landing/plans";
import { Wrap } from "@/components/landing/section";
import { StickyCta } from "@/components/landing/sticky-cta";
import { TopBar } from "@/components/landing/top-bar";
import { Trust } from "@/components/landing/trust";
import { alternatesFor } from "@/lib/i18n/alternates";
import { redirect } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return {
    title: { absolute: t("metadata.title") },
    description: t("metadata.description"),
    alternates: alternatesFor("/", await getLocale()),
  };
}

/**
 * The public landing. Everything below prerenders into the shell (spec §3); only the session check is
 * request-time, in its own boundary, and it renders nothing — it only moves a signed-in visitor (the
 * home-screen app opens "/") into the app, as the old welcome screen did.
 */
export default async function Home() {
  const t = await getTranslations("home.hero");
  return (
    <div className="flex flex-1 flex-col">
      <Suspense fallback={null}>
        <SignedInRedirect />
      </Suspense>
      <Wrap><TopBar /></Wrap>
      <main className="flex-1">
        <Wrap><Hero /></Wrap>
        <HowItWorks />
        <ExampleSection />
        <Features />
        <Plans />
        <Trust />
        <Wrap><FinalCta /></Wrap>
      </main>
      <Wrap><Footer /></Wrap>
      <StickyCta label={t("cta")} />
    </div>
  );
}

async function SignedInRedirect() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return redirect({ href: "/onboarding", locale: await getLocale() });
  return null;
}
