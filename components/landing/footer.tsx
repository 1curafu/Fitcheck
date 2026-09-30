import { getTranslations } from "next-intl/server";
import { LanguageButton } from "@/components/i18n/language-button";
import { Link } from "@/lib/i18n/navigation";

/**
 * Stacked on a phone (so the language menu opens rightward from the left gutter), one row from md.
 * The language switch sits before the copyright, never at the right edge, so its start-aligned menu stays on screen.
 */
export async function Footer() {
  const t = await getTranslations("home");
  const legal = await getTranslations("legal");
  const brand = await getTranslations("landing");
  const link = "hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand";
  return (
    <footer className="flex flex-col items-start gap-3.5 border-t border-[rgba(237,230,216,0.07)] pb-10 pt-[26px] text-[13px] text-muted-foreground md:flex-row md:items-center md:justify-between md:gap-x-[22px]">
      <span aria-hidden className="font-serif text-[18px] text-foreground-strong">{brand("wordmark")}</span>
      <nav aria-label={t("footer.legal")} className="flex flex-wrap gap-[18px]">
        <Link href="/privacy" className={link}>{legal("privacy.title")}</Link>
        <Link href="/terms" className={link}>{legal("terms.title")}</Link>
        <Link href="/sign-in" className={link}>{t("nav.signIn")}</Link>
      </nav>
      <LanguageButton />
      <span>{t("footer.copyright")}</span>
    </footer>
  );
}
