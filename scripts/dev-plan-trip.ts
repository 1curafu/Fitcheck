/**
 * Dev-only: plan a real trip for the developer, so the packing screens can be
 * looked at against a real closet without driving the UI by hand.
 *
 * Usage: npx tsx scripts/dev-plan-trip.ts
 * Read-mostly — it inserts one trip and its looks, nothing else.
 */
import { createClient } from "@supabase/supabase-js";
import { solveCapsule, QUALITY_FLOOR, type CapsuleItem } from "../lib/packing/capsule";
import { scheduleDays } from "../lib/packing/schedule";
import { expandDays, realBuilder } from "../lib/packing/plan";
import { mapTripForecast } from "../lib/weather/trip";
import { narrateTrip } from "../lib/packing/narrate";
import type { CandidateItem } from "../lib/generator/candidates";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const START = "2026-09-01";
const END = "2026-09-07";
const MIX = { work: 3, everyday: 2, evening: 2 };

async function main() {
  const { data: users } = await db.auth.admin.listUsers();
  const me = users.users.find((u) => u.email === "icurafu333@gmail.com");
  if (!me) throw new Error("dev user not found");

  const { data: closet } = await db
    .from("items")
    .select("id, name, subcategory, category, colors, formality, seasons, material, texture, pattern")
    .eq("user_id", me.id)
    .eq("archived", false);
  const items = (closet ?? []) as unknown as CandidateItem[];

  const days = expandDays(START, END, MIX);
  // A plausible early-September forecast, so this needs no network.
  const forecast = mapTripForecast(
    {
      daily: {
        time: days.map((d) => d.date),
        temperature_2m_max: [24, 23, 21, 19, 22, 25, 20],
        temperature_2m_min: [15, 14, 13, 12, 14, 16, 13],
        weather_code: [0, 1, 3, 61, 0, 0, 3],
      },
    },
    days.map((d) => d.date),
  );

  const build = realBuilder(items, (date) => forecast.byDate[date], { aesthetic: ["Old Money"] });
  const solved = solveCapsule({
    closet: items.map((i) => ({ id: i.id, category: i.category })) as CapsuleItem[],
    days,
    level: 3,
    floor: QUALITY_FLOOR,
    build,
  });
  const scheduled = scheduleDays(solved);

  console.log(`capsule: ${solved.itemIds.length} pieces, ${solved.covered.length}/${days.length} days covered`);

  // ⚠️ The REAL narrator, not a fixed string. The first version of this script
  // wrote one sentence seven times, which looked exactly like the model
  // repeating itself — it had simply never been called.
  const byId = new Map(items.map((i) => [i.id, i]));
  const describe = (ids: string[]) =>
    ids.flatMap((id) => {
      const it = byId.get(id) as (CandidateItem & { subcategory?: string | null }) | undefined;
      return it
        ? [{ category: it.category, subcategory: it.subcategory ?? null, colors: it.colors, material: it.material, texture: it.texture, pattern: it.pattern }]
        : [];
    });

  const narration = await narrateTrip({
    days: scheduled.map((d) => ({
      occasion: d.day.occasion,
      tempC: forecast.byDate[d.day.date]?.tempC ?? 15,
      rain: forecast.byDate[d.day.date]?.rain ?? false,
      pieces: describe(d.itemIds),
    })),
    capsule: describe(solved.itemIds),
    aesthetic: ["Old Money"],
    destination: "Lisbon, Portugal",
    beyondHorizon: forecast.beyondHorizon,
  });
  console.log(`\ncapsule why: ${narration.capsule_why}\n`);
  narration.days.forEach((d, i) => console.log(`  ${i + 1}. ${d.name} — ${d.why}`));

  await db.from("trips").delete().eq("user_id", me.id);
  const { data: trip, error } = await db
    .from("trips")
    .insert({
      user_id: me.id,
      destination_label: "Lisbon, Portugal",
      lat: 38.72,
      lon: -9.14,
      timezone: "Europe/Lisbon",
      start_date: START,
      end_date: END,
      occasion_mix: MIX,
      rewear_level: 3,
    })
    .select("id")
    .single();
  if (error || !trip) throw error;

  await db.from("trip_items").insert(solved.itemIds.map((itemId) => ({ trip_id: trip.id, item_id: itemId, pinned: false })));

  const { data: outfits } = await db
    .from("outfits")
    .insert(
      scheduled.map((d, i) => ({
        user_id: me.id,
        trip_id: trip.id,
        trip_day: d.day.date,
        occasion: d.day.occasion,
        look_name: narration.days[i]?.name ?? `Day ${i + 1}`,
        ai_reasoning: narration.days[i]?.why ?? "",
      })),
    )
    .select("id");

  await db.from("outfit_items").insert(
    scheduled.flatMap((d, i) => d.itemIds.map((itemId) => ({ outfit_id: outfits![i].id, item_id: itemId, slot: "piece" }))),
  );

  console.log(`\nopen: http://localhost:3000/packing/${trip.id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
