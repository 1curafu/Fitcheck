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

  const [profileRes, itemsRes, logsRes, outfitsRes, piecesRes] = await Promise.all([
    supabase.from("profiles").select("tier, archetype, palette, fit").eq("id", user.id).single(),
    supabase.from("items").select("*").eq("user_id", user.id).eq("archived", false),
    supabase.from("wear_logs").select("outfit_id").eq("user_id", user.id),
    supabase.from("outfits").select("id, occasion").eq("user_id", user.id),
    supabase.from("outfit_items").select("outfit_id, item_id"),
  ]);
  for (const res of [itemsRes, logsRes, outfitsRes, piecesRes]) if (res.error) throw new Error(res.error.message);

  const rows = itemsRes.data ?? [];
  const quiz = readStyleProfile(profileRes.data);
  const dna = buildStyleDna({
    closet: rows.map(toCandidateItem),
    quiz: { archetype: quiz.archetype, palette: quiz.palette, fit: quiz.fit },
    logs: logsRes.data ?? [], outfits: outfitsRes.data ?? [], pieces: piecesRes.data ?? [],
  });

  const byId = new Map(rows.map((row) => [row.id as string, row]));
  const top = dna.signature.status === "found" ? dna.signature.pieces.flatMap((p) => (byId.has(p.id) ? [{ ...p, row: byId.get(p.id)! }] : [])) : [];
  const images = await signItemImages(top.map((p) => displayPath(p.row, "thumb")));
  const signaturePieces = top.map((p) => ({
    id: p.id, wears: p.wears, name: (p.row.name as string | null) ?? t("kind.top"), imageUrl: images.get(displayPath(p.row, "thumb")) ?? null,
  }));

  return (
    <>
      <ScreenHeader title={t("title")} backHref="/profile" />
      <StyleDnaView dna={dna} signaturePieces={signaturePieces} isPro={entitlementsFor(profileRes.data?.tier).gapAnalysis} />
    </>
  );
}
