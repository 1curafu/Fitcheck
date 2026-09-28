import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { SHIPPED_LOCALES } from "@/lib/i18n/locales";
import { SITE_URL } from "@/lib/site";
import { Libre_Caslon_Text, Hanken_Grotesk, EB_Garamond, Inter } from "next/font/google";
import "../globals.css";
import { MobileShell } from "@/components/shell/mobile-shell";
import { SiteAnalytics } from "@/components/shell/analytics";

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

/** Cyrillic faces fill gaps in Caslon/Hanken; no preload keeps downloads demand-driven. */
const serifCyrillic = EB_Garamond({ subsets: ["cyrillic"], weight: ["400", "700"], style: ["normal", "italic"],
  variable: "--font-serif-cyrillic", display: "swap", preload: false });
const sansCyrillic = Inter({ subsets: ["cyrillic"], weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans-cyrillic", display: "swap", preload: false });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  const description = t("description");
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: "Fitcheck", template: "%s — Fitcheck" },
    description,
    applicationName: "Fitcheck",
    openGraph: { type: "website", siteName: "Fitcheck", title: "Fitcheck", description, locale: (await getLocale()).replace("-", "_"),
      images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: "Fitcheck" }] },
    twitter: { card: "summary_large_image", title: "Fitcheck", description, images: [`${SITE_URL}/opengraph-image`] },
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
}

export const viewport: Viewport = {
  themeColor: "#0E0E10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export function generateStaticParams() {
  return SHIPPED_LOCALES.map((locale) => ({ locale }));
}

// Not `LayoutProps<"/[locale]">`: that helper exists only after `next typegen`, and CI type-checks before building.
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${serif.variable} ${sans.variable} ${serifCyrillic.variable} ${sansCyrillic.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <MobileShell>{children}</MobileShell>
        </NextIntlClientProvider>
        {/* Cookieless page-view counting — a daily-rotating hash, nothing stored
            on the device — which is what lets the cookie notice stay a notice.
            Disclosed in /privacy; a test holds the policy to that. */}
        <SiteAnalytics />
      </body>
    </html>
  );
}
