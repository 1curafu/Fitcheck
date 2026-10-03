import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { ScreenHeader } from "@/components/shell/screen-header";
import { MobileNav } from "@/components/shell/mobile-nav";
import { StyleDnaView } from "@/components/style-dna/style-dna-view";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/lib/i18n/navigation";
import { toCandidateItem } from "@/lib/generator/from-row";
import { readStyleProfile } from "@/lib/onboarding/style-profile";
import { entitlementsFor } from "@/lib/billing/tiers";
import { displayPath, signItemImages } from "@/lib/storage/signed";
import { buildStyleDna } from "@/lib/style-dna";
import { readAll, readWearHistory } from "@/lib/style-dna/history";
import { pieceKind } from "@/lib/style-dna/kinds";

/** The shared mapper's input, plus the display name a signature piece shows. */
type ItemRow = Parameters<typeof toCandidateItem>[0] & { name?: string | null };

export default async function StyleDnaPage() {
  const t = await getTranslations("styleDna");
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      {/* The header is the shell and the fallback, so nothing moves when the personal body lands (Decision 6). */}
      <Suspense fallback={<ScreenHeader title={t("title")} backHref="/profile" />}>
        <StyleDnaBody />
      </Suspense>
      <MobileNav />
    </div>
  );
}

async function StyleDnaBody() {
  const t = await getTranslations("styleDna");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect({ href: "/sign-in", locale: await getLocale() });

  const [profileRes, rows, history] = await Promise.all([
    supabase.from("profiles").select("tier, archetype, palette, fit").eq("id", user.id).single(),
    // Paged like the history: a closet can outgrow the 1000-row response cap.
    readAll<ItemRow>((from, to) =>
      supabase.from("items").select("*").eq("user_id", user.id).eq("archived", false).order("id").range(from, to)),
    readWearHistory(supabase, user.id),
  ]);
  // A failed read would otherwise pass for a free user with no quiz answers.
  if (profileRes.error) throw new Error(profileRes.error.message);

  const quiz = readStyleProfile(profileRes.data);
  const closet = rows.map(toCandidateItem);
  const dna = buildStyleDna({
    closet,
    quiz: { archetype: quiz.archetype, palette: quiz.palette, fit: quiz.fit },
    logs: history.logs, outfits: history.outfits, pieces: history.pieces,
  });

  const byId = new Map(rows.map((row, i) => [row.id, { row, item: closet[i] }]));
  const top = dna.signature.status === "found" ? dna.signature.pieces.flatMap((p) => (byId.has(p.id) ? [{ ...p, ...byId.get(p.id)! }] : [])) : [];
  const images = await signItemImages(top.map((p) => displayPath(p.row as never, "thumb")));
  const signaturePieces = top.map((p) => {
    // An unnamed piece is called by its own kind ("Loafers"), never a generic word.
    const kind = pieceKind(p.item);
    return {
      id: p.id, wears: p.wears, imageUrl: images.get(displayPath(p.row as never, "thumb")) ?? null,
      name: p.row.name ?? (kind ? t(`kind.${kind}`) : p.item.category),
    };
  });

  return (
    <>
      <ScreenHeader title={t("title")} backHref="/profile" />
      <StyleDnaView dna={dna} signaturePieces={signaturePieces} isPro={entitlementsFor(profileRes.data?.tier).gapAnalysis} />
    </>
  );
}
