import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { ScreenHeader } from "@/components/shell/screen-header";
import { redirect } from "@/lib/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/shell/mobile-nav";
import { todayFor } from "@/lib/outfits/today";
import { entitlementsFor } from "@/lib/billing/tiers";
import { closetStats, mostWorn, gatheringDust } from "@/lib/stats/aggregate";
import { readStyleProfile } from "@/lib/onboarding/style-profile";
import { biggestGap, hiddenByNogos, slotCounts, relevantOccasions, SIMULATED_CONDITIONS } from "@/lib/stats/gap";
import { rankPurchases, closetRead, type AdvisorPrefs } from "@/lib/stats/advisor";
import { personalBand } from "@/lib/generator/rules";
import { StatsView } from "@/components/stats/stats-view";
import { missingCategory, type CandidateItem } from "@/lib/generator/candidates";
import type { UiOccasion } from "@/lib/generator/types";
import { toCandidateItem } from "@/lib/generator/from-row";

/** All four, so the gap answers "what should I buy", not "what suits Tuesday". */
const ALL_OCCASIONS: UiOccasion[] = ["everyday", "work", "weekend", "evening"];

const TOP_N = 3;

async function cachedAdvice(_userId: string, closet: CandidateItem[], prefs: AdvisorPrefs) {
  "use cache";
  cacheLife("hours");
  return { purchases: rankPurchases(closet, prefs), read: closetRead(closet) };
}

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
  if (!user) return redirect({ href: "/sign-in", locale: await getLocale() });

  const [
    { data: profile },
    { data: itemsRaw },
    { data: logs },
    { data: pieces },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("tier, location_timezone, formality_min, formality_max, nogos, palette, fit, archetype")
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
  const quiz = readStyleProfile(profile);
  // Quiz part 2: the advice honours the user's dress codes and no-gos, as the stylist does.
  const gapPrefs = {
    formality_min: profile?.formality_min ?? null,
    formality_max: profile?.formality_max ?? null,
    nogos: quiz.nogos,
  };
  // Skipped entirely for a user who cannot see it — a few dozen passes over the
  // closet is cheap, but computing an answer nobody is shown is still waste.
  const missing = missingCategory(closet, {
    band: personalBand(relevantOccasions(ALL_OCCASIONS, gapPrefs)[0] ?? "everyday", gapPrefs),
    weather: SIMULATED_CONDITIONS[0], excludeItemIds: [], maxAccessories: 0, nogos: gapPrefs.nogos,
  });
  const gap = entitlements.gapAnalysis && missing
    ? biggestGap(closet, ALL_OCCASIONS, gapPrefs)
    : null;
  // Full tags and preferences join the user id in the cache key, so edits cannot reuse stale advice.
  const advice = entitlements.gapAnalysis && !missing
    ? await cachedAdvice(user.id, closet.slice().sort((a, b) => a.id.localeCompare(b.id)), {
      ...gapPrefs, palette: quiz.palette, fitPref: quiz.fit, aesthetic: quiz.archetype ? [quiz.archetype] : [],
    }) : null;
  const vocab = await getTranslations("vocab.color");
  const read = advice ? t(`closetRead.${advice.read.kind}`, {
    colours: new Intl.ListFormat(await getLocale(), { style: "long", type: "conjunction" }).format(advice.read.top.map(color => vocab(color))),
  }) : "";

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
    const counts = slotCounts(closet, ALL_OCCASIONS, gapPrefs);
    const mine = counts[gap.candidate.category] ?? 0;
    // "You have 0 bottoms" is false for someone whose bottoms their own no-gos hide: say what is actually happening.
    const hidden = hiddenByNogos(closet, ALL_OCCASIONS, gapPrefs)[gap.candidate.category] ?? 0;
    if (mine === 0 && hidden > 0) return t("reasonNogos", { hidden: slotPhrase(gap.candidate.category, hidden) });
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
      gap={gap && { label: t(`gapPieces.${gap.candidate.label}`), share: gap.share, reason }}
      advisor={advice && { read, purchases: advice.purchases.map(row => ({
        label: row.purchase.label, colorKey: row.purchase.color, pairsWith: row.pairsWith, partners: row.partners.map(nameOf),
      })) }}
      entitlements={{
        analytics: entitlements.analytics,
        gapAnalysis: entitlements.gapAnalysis,
      }}
      isPro={entitlements.tier === "pro"}
    />
  );
}
