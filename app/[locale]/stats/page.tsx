import { Suspense } from "react";
import { ScreenHeader } from "@/components/shell/screen-header";
import { redirect } from "@/lib/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/shell/mobile-nav";
import { todayFor } from "@/lib/outfits/today";
import { entitlementsFor } from "@/lib/billing/tiers";
import { closetStats, mostWorn, gatheringDust } from "@/lib/stats/aggregate";
import { biggestGap, slotCounts } from "@/lib/stats/gap";
import { StatsView } from "@/components/stats/stats-view";
import type { CandidateItem } from "@/lib/generator/candidates";
import type { UiOccasion } from "@/lib/generator/types";
import { toCandidateItem } from "@/lib/generator/from-row";

/** All four, so the gap answers "what should I buy", not "what suits Tuesday". */
const ALL_OCCASIONS: UiOccasion[] = ["everyday", "work", "weekend", "evening"];

const TOP_N = 3;

export default async function StatsPage() {
  const t = await getTranslations("stats");
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      {/* The nav is the shell — identical for every user, so it prerenders
          and prefetches. Everything below needs the session. */}
      <Suspense
        fallback={<ScreenHeader title={t("title")} backHref="/profile" />}
      >
        <StatsBody />
      </Suspense>
      <MobileNav />
    </div>
  );
}

async function StatsBody() {
  const t = await getTranslations("stats");
  const slotPhrase = (category: string, n: number) => {
    const key = (["Tops", "Bottoms", "Shoes", "Outerwear"] as string[]).includes(category)
      ? category as "Tops" | "Bottoms" | "Shoes" | "Outerwear" : "other";
    return t(`slot.${key}`, { n });
  };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect({ href: "/", locale: await getLocale() });

  const [
    { data: profile },
    { data: itemsRaw },
    { data: logs },
    { data: pieces },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("tier, location_timezone")
      .eq("id", user.id)
      .single(),
    supabase
      .from("items")
      .select("*")
      .eq("user_id", user.id)
      .eq("archived", false),
    supabase
      .from("wear_logs")
      .select("outfit_id, worn_on")
      .eq("user_id", user.id),
    /**
     * ⚠️ `wear_logs` and `outfit_items` are NOT directly related — both hang
     * off `outfits`. A `wear_logs → outfit_items!inner(...)` embed returns
     * ZERO rows SILENTLY, which is how every item once read "0 times worn"
     * while SQL said otherwise (PR #22). Two explicit queries, joined below.
     */
    supabase.from("outfit_items").select("outfit_id, item_id"),
  ]);

  const items = itemsRaw ?? [];
  const wears = logs ?? [];

  // outfit_id → the items in it, so a wear can be attributed to each piece.
  const itemsByOutfit = new Map<string, string[]>();
  for (const p of pieces ?? []) {
    const list = itemsByOutfit.get(p.outfit_id) ?? [];
    list.push(p.item_id);
    itemsByOutfit.set(p.outfit_id, list);
  }

  const wearsById: Record<string, number> = {};
  const lastWornById: Record<string, string> = {};
  for (const w of wears) {
    for (const itemId of itemsByOutfit.get(w.outfit_id) ?? []) {
      wearsById[itemId] = (wearsById[itemId] ?? 0) + 1;
      if (!lastWornById[itemId] || w.worn_on > lastWornById[itemId]) {
        lastWornById[itemId] = w.worn_on;
      }
    }
  }

  const today = await todayFor(profile?.location_timezone);
  const byId = new Map(items.map((i) => [i.id, i]));
  const nameOf = (id: string) => byId.get(id)?.name ?? t("thatPiece");

  const stats = closetStats(
    items,
    wears.flatMap((w) =>
      (itemsByOutfit.get(w.outfit_id) ?? []).map((item_id) => ({ item_id })),
    ),
    await getLocale(),
  );
  const entitlements = entitlementsFor(profile?.tier);

  const closet: CandidateItem[] = items.map(toCandidateItem);
  // Skipped entirely for a user who cannot see it — a few dozen passes over the
  // closet is cheap, but computing an answer nobody is shown is still waste.
  const gap = entitlements.gapAnalysis
    ? biggestGap(closet, ALL_OCCASIONS)
    : null;

  /**
   * The reason line names the gap in the user's OWN counts.
   *
   * This is not decoration on the percentage — it IS what the simulation found.
   * A wardrobe is a product of its slots, so the piece worth buying is the one
   * in the shallowest slot, and "1 coat against 10 tops" is a claim the user can
   * check by counting. That is the kind of "why" this app sells; a bare
   * percentage is not.
   *
   * ⚠️ It is phrased about the WINNING candidate's slot, never about the
   * smallest slot in the abstract — those can differ, and the first version
   * recommended a camel overcoat while explaining that shoes were the problem.
   */
  const reason = (() => {
    if (!gap) return "";
    const counts = slotCounts(closet, ALL_OCCASIONS);
    const mine = counts[gap.candidate.category] ?? 0;
    const deepest = Object.entries(counts).reduce((a, b) =>
      b[1] > a[1] ? b : a,
    );
    if (deepest[0] === gap.candidate.category || deepest[1] <= mine) {
      return t("reasonPairs");
    }
    return t("reasonCounts", { mine: slotPhrase(gap.candidate.category, mine), deepest: slotPhrase(deepest[0], deepest[1]) });
  })();

  return (
    <StatsView
      value={stats.value}
      // Wears are logged against an OUTFIT, so the headline is the number of
      // logged outfits — not the sum of per-item attributions, which counts a
      // five-piece look five times.
      totalWears={wears.length}
      avgCostPerWear={stats.avgCostPerWear}
      mostWorn={mostWorn(items, wearsById, TOP_N).map((id) => ({
        id,
        name: nameOf(id),
        sub: wearsById[id] === 1 ? t("wornOnce") : t("wornTimes", { n: wearsById[id] }),
      }))}
      dust={gatheringDust(items, lastWornById, today, TOP_N).map((d) => ({
        id: d.id,
        name: nameOf(d.id),
        days: d.days,
      }))}
      gap={gap && { label: gap.candidate.label, share: gap.share, reason }}
      entitlements={{
        analytics: entitlements.analytics,
        gapAnalysis: entitlements.gapAnalysis,
      }}
      isPro={entitlements.tier === "pro"}
    />
  );
}
