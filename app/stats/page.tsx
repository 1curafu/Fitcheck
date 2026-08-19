import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/shell/mobile-nav";
import { localDateFor } from "@/lib/outfits/local-date";
import { entitlementsFor } from "@/lib/billing/tiers";
import { closetStats, mostWorn, gatheringDust } from "@/lib/stats/aggregate";
import { biggestGap, slotCounts } from "@/lib/stats/gap";
import { StatsView } from "@/components/stats/stats-view";
import type { CandidateItem } from "@/lib/generator/candidates";
import type { UiOccasion } from "@/lib/generator/types";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/** All four, so the gap answers "what should I buy", not "what suits Tuesday". */
const ALL_OCCASIONS: UiOccasion[] = ["everyday", "work", "weekend", "evening"];

const TOP_N = 3;

/**
 * Plain words for a slot, singular and plural.
 *
 * "1 outerwear against 10 tops" is not English, and neither is "1 coats" —
 * both were shipped and caught on the screen rather than in a test.
 */
const SLOT_WORD: Record<string, [string, string]> = {
  Tops: ["top", "tops"],
  Bottoms: ["bottom", "bottoms"],
  Shoes: ["pair of shoes", "pairs of shoes"],
  Outerwear: ["coat", "coats"],
};

function slotPhrase(category: string, n: number): string {
  const [one, many] = SLOT_WORD[category] ?? ["piece", "pieces"];
  return `${n} ${n === 1 ? one : many}`;
}

export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: profile }, { data: itemsRaw }, { data: logs }, { data: pieces }] =
    await Promise.all([
      supabase.from("profiles").select("tier, location_timezone").eq("id", user.id).single(),
      supabase.from("items").select("*").eq("user_id", user.id).eq("archived", false),
      supabase.from("wear_logs").select("outfit_id, worn_on").eq("user_id", user.id),
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

  const today = localDateFor(new Date(), profile?.location_timezone ?? "UTC");
  const byId = new Map(items.map((i) => [i.id, i]));
  const nameOf = (id: string) => byId.get(id)?.name ?? "That piece";

  const stats = closetStats(items, wears.flatMap((w) => (itemsByOutfit.get(w.outfit_id) ?? []).map((item_id) => ({ item_id }))));
  const entitlements = entitlementsFor(profile?.tier);

  const closet: CandidateItem[] = items.map((i) => ({
    id: i.id,
    category: i.category,
    colors: i.colors ?? [],
    formality: i.formality,
    seasons: i.seasons ?? [],
    material: i.material,
    texture: i.texture,
    pattern: i.pattern,
  }));
  // Skipped entirely for a user who cannot see it — a few dozen passes over the
  // closet is cheap, but computing an answer nobody is shown is still waste.
  const gap = entitlements.gapAnalysis ? biggestGap(closet, ALL_OCCASIONS) : null;

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
    const deepest = Object.entries(counts).reduce((a, b) => (b[1] > a[1] ? b : a));
    if (deepest[0] === gap.candidate.category || deepest[1] <= mine) {
      return "It pairs with more of your closet than anything else you're missing.";
    }
    return `You have ${slotPhrase(gap.candidate.category, mine)} against ${slotPhrase(deepest[0], deepest[1])} — that's what's holding the rest back.`;
  })();

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
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
          sub: wearsById[id] === 1 ? "Worn once" : `Worn ${wearsById[id]} times`,
        }))}
        dust={gatheringDust(items, lastWornById, today, TOP_N).map((d) => ({
          id: d.id,
          name: nameOf(d.id),
          days: d.days,
        }))}
        gap={
          gap && { label: gap.candidate.label, share: gap.share, reason }
        }
        entitlements={{
          analytics: entitlements.analytics,
          gapAnalysis: entitlements.gapAnalysis,
        }}
        isPro={entitlements.tier === "pro"}
      />
      <MobileNav />
    </div>
  );
}
