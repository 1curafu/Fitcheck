import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/site";
import { Libre_Caslon_Text, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { MobileShell } from "@/components/shell/mobile-shell";

const serif = Libre_Caslon_Text({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-libre-caslon",
  display: "swap",
});

const sans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-hanken",
  display: "swap",
});

const DESCRIPTION = "Your AI stylist. Daily looks from the clothes you already own.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Fitcheck", template: "%s — Fitcheck" },
  description: DESCRIPTION,
  applicationName: "Fitcheck",
  openGraph: { type: "website", siteName: "Fitcheck", title: "Fitcheck", description: DESCRIPTION, locale: "en_GB" },
  twitter: { card: "summary_large_image", title: "Fitcheck", description: DESCRIPTION },
  // Google Search Console: paste the token from "HTML tag" verification into Vercel env.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fitcheck",
  },
};

export const viewport: Viewport = {
  themeColor: "#0E0E10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <MobileShell>{children}</MobileShell>
        {/* Cookieless page-view counting — a daily-rotating hash, nothing stored
            on the device — which is what lets the cookie notice stay a notice.
            Disclosed in /privacy; a test holds the policy to that. */}
        <Analytics />
      </body>
    </html>
  );
}
