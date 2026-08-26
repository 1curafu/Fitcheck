/**
 * Task 5 of the packing-capsule-engine plan: choose the quality floor by
 * MEASURING it against the developer's real closet.
 *
 * ⚠️ **The floor is the one tuned parameter in this feature, and it must not be
 * invented.** Too high and no capsule is ever small; too low and some day is
 * mediocre. The wear-stats gap card was rebuilt THREE times because a threshold
 * was reasoned about rather than measured — it claimed "258 new outfits"
 * (uncredible), a camel overcoat could never win, and a closet that could build
 * nothing reported "Adds 1% more outfits".
 *
 * Usage: npx tsx scripts/calibrate-packing-floor.ts
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 *
 * Read-only. It writes nothing, so it needs no --apply guard.
 */
import { createClient } from "@supabase/supabase-js";
import { solveCapsule, type CapsuleItem, type OutfitBuilder, type TripDay } from "../lib/packing/capsule";
import { buildCandidates, type CandidateItem } from "../lib/generator/candidates";
import { scoreCombo, type ScoreItem } from "../lib/generator/score";
import { occasionBand, type Weather } from "../lib/generator/rules";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/** A fixed 7-day trip: 3 work, 2 everyday, 2 evening. */
const TRIP: TripDay[] = [
  { date: "2026-05-12", occasion: "work" },
  { date: "2026-05-13", occasion: "work" },
  { date: "2026-05-14", occasion: "work" },
  { date: "2026-05-15", occasion: "everyday" },
  { date: "2026-05-16", occasion: "everyday" },
  { date: "2026-05-17", occasion: "evening" },
  { date: "2026-05-18", occasion: "evening" },
];

// A mild spring forecast — deliberately unremarkable, so the floor is not tuned
// against a freak cold snap that would drag outerwear into every look.
const WEATHER: Weather = { tempC: 19, rain: false, highC: 22, lowC: 14 };

async function loadCloset(): Promise<CandidateItem[]> {
  const { data, error } = await db
    .from("items")
    .select("id, category, colors, formality, seasons, material, texture, pattern, user_id")
    .eq("archived", false);
  if (error) throw error;

  // The largest closet on the box is the developer's real one; the e2e user's
  // seven fixtures would calibrate against a wardrobe with a deliberate shape.
  const byUser = new Map<string, CandidateItem[]>();
  for (const row of data ?? []) {
    const list = byUser.get(row.user_id) ?? [];
    list.push(row as unknown as CandidateItem);
    byUser.set(row.user_id, list);
  }
  const biggest = [...byUser.values()].sort((a, b) => b.length - a.length)[0] ?? [];
  return biggest;
}

/** The real builder: candidates from the generator, scored by the generator. */
function makeBuilder(closet: CandidateItem[]): OutfitBuilder {
  const byId = new Map(closet.map((i) => [i.id, i]));

  return (day, available) => {
    const pool = available.flatMap((a) => {
      const full = byId.get(a.id);
      return full ? [full] : [];
    });
    const band = occasionBand(day.occasion as Parameters<typeof occasionBand>[0]);
    const combos = buildCandidates(pool, {
      band,
      weather: WEATHER,
      excludeItemIds: [],
      maxAccessories: 1,
    });
    if (combos.length === 0) return null;

    let best: { itemIds: string[]; score: number } | null = null;
    for (const combo of combos) {
      const score = scoreCombo(combo as unknown as ScoreItem[], { aesthetic: [], band });
      if (!best || score > best.score) best = { itemIds: combo.map((i) => i.id), score };
    }
    return best;
  };
}

async function main() {
  const closet = await loadCloset();
  const build = makeBuilder(closet);
  const items: CapsuleItem[] = closet.map((i) => ({ id: i.id, category: i.category }));

  console.log(`closet: ${items.length} items · trip: ${TRIP.length} days (3 work, 2 everyday, 2 evening)\n`);

  for (const level of [1, 3, 5]) {
    console.log(`── re-wear level ${level} ──`);
    console.log(`  ${"floor".padEnd(7)}${"pieces".padStart(8)}${"uncovered".padStart(11)}${"worst day".padStart(11)}`);

    for (let floor = 0; floor <= 0.9; floor += 0.1) {
      const f = Math.round(floor * 10) / 10;
      const r = solveCapsule({ closet: items, days: TRIP, level, floor: f, build });

      // ⚠️ The WORST covered day, never an average — one bad day hides inside a
      // good mean, and one bad day is exactly what the floor exists to prevent.
      let worst = Infinity;
      for (const c of r.covered) {
        const day = c.day;
        const scored = build(day, items.filter((i) => c.itemIds.includes(i.id)));
        if (scored) worst = Math.min(worst, scored.score);
      }

      console.log(
        `  ${String(f).padEnd(7)}` +
          `${String(r.itemIds.length).padStart(8)}` +
          `${String(r.uncovered.length).padStart(11)}` +
          `${(worst === Infinity ? "—" : worst.toFixed(3)).padStart(11)}`,
      );
    }
    console.log("");
  }

  console.log("Pick the HIGHEST floor that still leaves 0 uncovered at every level.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
