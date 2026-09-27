import type { Metadata } from "next";
import { Suspense } from "react";
import { Link, redirect } from "@/lib/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { EmailSignIn } from "@/components/auth/email-sign-in";
import { BrandMark } from "@/components/brand/mark";
import { AccountDeletedNotice } from "@/components/auth/account-deleted-notice";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  return {
    title: { absolute: t("metadata.title") },
    description: t("metadata.description"),
    alternates: { canonical: "/" },
  };
}

export default function Welcome({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  // The session read is what blocks a shell, so it moves behind a boundary
  // and the route's chrome prerenders and prefetches without it.
  return (
    <Suspense fallback={null}>
      <WelcomeBody searchParams={searchParams} />
    </Suspense>
  );
}

async function WelcomeBody({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const t = await getTranslations("landing");
  const { account } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return redirect({ href: "/onboarding", locale: await getLocale() });

  return (
    <main className="screen-top flex flex-1 flex-col justify-between px-7 pb-10">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {account === "deleted" && <AccountDeletedNotice />}
        {/* ⚠️ Deliberately ABOVE the kicker and deliberately small. The
            wordmark below is the Display step — DESIGN.md reserves ~4.5rem
            Caslon for "the wordmark and welcome-screen moments only" — so the
            mark supports it and must not compete with it. 56px against 72px
            type reads as a lockup; matching their sizes would read as two
            logos. The 28px gap is the brand's 25%-of-tile clear space, rounded
            to the kicker's own rhythm. */}
        <BrandMark size={56} className="mb-[28px]" />
        <p className="mb-[22px] text-[13px] uppercase tracking-[0.34em] text-brand">
          {t("kicker")}
        </p>
        <h1 className="font-serif text-7xl/[0.92] tracking-[-0.02em] text-foreground">
          {t("wordmark")}
        </h1>
        <p className="mt-[26px] max-w-[280px] font-serif text-[21px]/[1.45] italic text-muted-foreground">
          {t("heroDescription")}
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <OAuthButtons />
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-muted-dim">
          <span className="h-px flex-1 bg-[--border]" />
          {t("or")}
          <span className="h-px flex-1 bg-[--border]" />
        </div>
        <EmailSignIn />
        <p className="mt-5 text-center text-[11.5px] text-muted-dim">
          {t("legalLead")}{" "}
          <Link href="/terms" className="text-muted-foreground underline underline-offset-2">{t("terms")}</Link>
          {" "}{t("and")}{" "}
          <Link href="/privacy" className="text-muted-foreground underline underline-offset-2">{t("privacy")}</Link>.
        </p>
      </div>
    </main>
  );
}
