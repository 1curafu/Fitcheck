import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { formatShortDate } from "@/lib/i18n/format";
import { FlatLay } from "@/components/generate/flat-lay";
import type { SavedLook } from "@/lib/outfits/saved";
import type { LookPiece, UiOccasion } from "@/lib/generator/types";

export type SavedCard = SavedLook & { displayPieces: LookPiece[] };

export async function SavedGrid({ looks, savedCount, limit, more }: {
  looks: SavedCard[]; savedCount: number; limit: number | null; more: boolean;
}) {
  const locale = await getLocale();
  const t = await getTranslations("savedOutfits");
  const tOccasion = await getTranslations("vocab.occasion");
  const tBilling = await getTranslations("billing");
  const last = looks.at(-1);
  return (
    <div className="px-[22px] pb-[120px] pt-5">
      {limit !== null && (
        <div className="mb-5 space-y-2 text-sm text-muted-foreground">
          <p>{t("count", { saved: savedCount, limit })}</p>
          {savedCount > limit && <p>{t("overLimit", { saved: savedCount, limit })}</p>}
          {savedCount >= limit && <Link href="/profile" className="inline-flex min-h-11 items-center underline underline-offset-4">{tBilling("goPro")}</Link>}
        </div>
      )}
      {looks.length === 0 ? (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>{t("empty")}</p>
          <Link href="/generate" className="inline-flex min-h-11 items-center text-foreground underline underline-offset-4">{t("emptyCta")}</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6">
          {looks.map(look => (
            <Link key={look.id} href={`/outfits/${look.id}`} className="min-w-0 rounded-[16px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
              <FlatLay look={{ pieces: look.displayPieces }} animated={false} />
              <h2 className="mt-3 font-serif text-lg/[1.2] text-foreground">{look.lookName || t("title")}</h2>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatShortDate(new Date(`${look.date}T00:00:00Z`), locale)}
                {look.occasion && ` · ${["everyday", "work", "weekend", "evening"].includes(look.occasion) ? tOccasion(look.occasion as UiOccasion) : look.occasion}`}
              </p>
              {look.pieces.some(piece => piece.archived) && <p className="mt-2 text-xs text-muted-foreground">{t("removedPiece")}</p>}
            </Link>
          ))}
        </div>
      )}
      {more && last && <Link href={`/outfits?before=${encodeURIComponent(last.savedAt)}&beforeId=${last.id}`} className="mt-6 flex min-h-11 items-center justify-center rounded-full border border-border px-4 text-sm text-foreground">{t("showMore")}</Link>}
    </div>
  );
}
