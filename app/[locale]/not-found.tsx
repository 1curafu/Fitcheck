import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-[22px] text-center">
      <h1 className="font-serif text-[28px] text-foreground">{t("title")}</h1>
      <p className="text-[14px] text-muted-foreground">{t("body")}</p>
      <Link href="/" className="mt-2 min-h-[44px] text-[14px] text-foreground underline underline-offset-4">{t("home")}</Link>
    </main>
  );
}
