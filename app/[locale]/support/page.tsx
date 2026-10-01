import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { alternatesFor } from "@/lib/i18n/alternates";
import { ScreenHeader } from "@/components/shell/screen-header";
import { SupportForm } from "@/components/support/support-form";
import { getSupportPageConfig } from "@/lib/support/config";
import { sendSupportMessage } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "support" });
  return {
    title: t("title"), description: t("metadataDescription"),
    alternates: alternatesFor("/support", locale), robots: { index: false, follow: true },
  };
}

export default async function SupportPage() {
  const t = await getTranslations("support");
  const config = getSupportPageConfig();
  return <main className="flex flex-1 flex-col pb-16">
    <ScreenHeader title={t("title")} />
    <div className="px-[22px]">
    <p className="mb-7 mt-3 text-sm leading-relaxed text-muted-foreground">{t("description")}</p>
    <SupportForm {...config} onSendAction={sendSupportMessage} />
    <Link href="/" className="mt-8 inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4">{t("backHome")}</Link>
    </div>
  </main>;
}
