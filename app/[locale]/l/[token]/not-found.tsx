import { Link } from "@/lib/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function SharedLookNotFound() {
  const t = await getTranslations("share");
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
      <h1 className="font-serif text-[28px]/[1.15] text-foreground">{t("notFound")}</h1>
      <p className="text-[14px] text-muted-foreground">{t("looksLike")}</p>
      <Link href="/" className="grid min-h-[52px] w-full max-w-[320px] place-items-center rounded-[14px] bg-foreground text-[15px] font-semibold text-canvas">
        {t("getLooks")}
      </Link>
    </main>
  );
}
