import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/legal/legal-document";
import { TERMS } from "@/lib/legal/terms";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using Fitcheck.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <LegalDocumentView doc={TERMS} other={{ href: "/privacy", label: "Privacy Policy" }} />;
}
