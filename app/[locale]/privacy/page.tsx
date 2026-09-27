import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/legal/legal-document";
import { PRIVACY } from "@/lib/legal/privacy";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Fitcheck handles your photos and data — Swiss and EU law, processors named, no tracking cookies.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <LegalDocumentView doc={PRIVACY} other={{ href: "/terms", label: "Terms of Service" }} />;
}
