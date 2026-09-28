import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { LegalDocumentView } from "@/components/legal/legal-document";
import { TERMS } from "@/lib/legal/terms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.terms");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/terms" },
  };
}

export default async function TermsPage() {
  const t = await getTranslations("legal.privacy");
  return <LegalDocumentView doc={TERMS[await getLocale()]} other={{ href: "/privacy", label: t("title") }} />;
}
