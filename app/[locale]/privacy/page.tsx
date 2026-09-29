import { alternatesFor } from "@/lib/i18n/alternates";
import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { LegalDocumentView } from "@/components/legal/legal-document";
import { PRIVACY } from "@/lib/legal/privacy";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.privacy");
  return {
    title: t("title"),
    description: t("description"),
    alternates: alternatesFor("/privacy", await getLocale()),
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations("legal.terms");
  return <LegalDocumentView doc={PRIVACY[await getLocale()]} other={{ href: "/terms", label: t("title") }} />;
}
