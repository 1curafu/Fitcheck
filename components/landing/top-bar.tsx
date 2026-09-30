import { getTranslations } from "next-intl/server";
import { BrandMark } from "@/components/brand/mark";
import { LanguageButton } from "@/components/i18n/language-button";
import { Link } from "@/lib/i18n/navigation";

export async function TopBar() {
  const t = await getTranslations("home");
  const landing = await getTranslations("landing");
  return (
    <header className="flex items-center justify-between py-[18px]">
      <Link href="/" aria-label={t("nav.home")} className="inline-flex items-center gap-2.5 rounded-[10px] focus-visible:outline-2 focus-visible:outline-brand">
        <BrandMark size={30} />
        <span aria-hidden className="font-serif text-[22px] tracking-[-0.01em] text-foreground-strong">{landing("wordmark")}</span>
      </Link>
      <nav aria-label={t("nav.label")} className="flex items-center gap-1.5">
        <LanguageButton align="end" />
        <Link href="/sign-in" className="rounded-[10px] px-3.5 py-2.5 text-[14px] font-medium text-foreground shadow-[inset_0_0_0_1px_rgba(237,230,216,0.12)] hover:bg-surface-1 focus-visible:outline-2 focus-visible:outline-brand">
          {t("nav.signIn")}
        </Link>
      </nav>
    </header>
  );
}
