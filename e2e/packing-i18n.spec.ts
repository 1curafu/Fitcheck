import { expect, test } from "@playwright/test";
import { admin, testUserId } from "./helpers";
import uk from "../messages/uk.json";

test.use({ storageState: "e2e/.auth/state.json" });

test("historical trip looks translate on visit without changing originals, pieces or dates", async ({ page }) => {
  expect(["localhost", "127.0.0.1"]).toContain(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname);
  const db = admin(), userId = await testUserId();
  const dates = ["2026-09-20", "2026-09-21"];
  const weatherDates = [...dates, "2026-09-22"];
  const lat = 0.12, lon = 0.34;
  const prefs = await db.from("profiles").select("preferences").eq("id", userId).single();
  expect(prefs.error).toBeNull();
  const originalPreferences = prefs.data!.preferences;
  let tripId: string | undefined;
  try {
    const pieces = await db.from("items").select("id,name").eq("user_id", userId).order("id").limit(3);
    expect(pieces.error).toBeNull();
    expect(pieces.data).toHaveLength(3);
    // Dedicated local coordinates keep this fixture independent of live weather and other tests.
    const weather = await db.from("weather_cache").upsert(weatherDates.map(day => ({ lat, lon, day, fetched_at: new Date().toISOString(),
      payload: { timezone: "UTC", timezoneOffset: 0, hourly: [], daily: {
        dt: Date.parse(`${day}T12:00:00Z`) / 1000, max: 20, min: 3, conditionId: 800,
      } } })), { onConflict: "lat,lon,day" });
    expect(weather.error).toBeNull();
    const trip = await db.from("trips").insert({ user_id: userId, destination_label: "E2E Historical Trip", lat, lon,
      timezone: "UTC", start_date: dates[0], end_date: dates[1], occasion_mix: { everyday: 2 }, rewear_level: 3 }).select("id").single();
    expect(trip.error).toBeNull();
    tripId = trip.data!.id;
    const capsule = await db.from("trip_items").insert(pieces.data!.map(piece => ({ trip_id: tripId, item_id: piece.id, pinned: false })));
    expect(capsule.error).toBeNull();
    const looks = await db.from("outfits").insert(dates.map((date, index) => ({ user_id: userId, trip_id: tripId,
      trip_day: date, occasion: "everyday", look_name: `Historical Day ${index + 1}`, ai_reasoning: "Historical original why.", text_locale: "en-US" }))).select("id");
    expect(looks.error).toBeNull();
    const links = await db.from("outfit_items").insert(looks.data!.flatMap(look => pieces.data!.map(piece => ({ outfit_id: look.id, item_id: piece.id, slot: "piece" }))));
    expect(links.error).toBeNull();
    const columns = "id,look_name,ai_reasoning,text_locale,trip_day,layout,is_favorite,outfit_items(item_id)";
    const before = await db.from("outfits").select(columns).eq("trip_id", tripId).order("trip_day");
    const usage = await db.from("generation_events").select("id", { count: "exact", head: true }).eq("user_id", userId);

    await page.goto(`/uk/packing/${tripId}/days`);
    await expect(page.getByText("Тихий ранок", { exact: true })).toHaveCount(2, { timeout: 15_000 });
    await expect(page.getByText(pieces.data![0].name!, { exact: false }).first()).toBeVisible();
    const after = await db.from("outfits").select(columns).eq("trip_id", tripId).order("trip_day");
    expect(after.error).toBeNull();
    expect(after.data).toEqual(before.data);
    expect((await db.from("generation_events").select("id", { count: "exact", head: true }).eq("user_id", userId)).count).toBe(usage.count);

    const cached = await db.from("outfit_text_translations").select("why").eq("outfit_id", looks.data![0].id).eq("target_locale", "uk").single();
    expect(cached.error).toBeNull();
    const unitChange = await db.from("profiles").update({ preferences: { ...originalPreferences, tempUnit: "F" } }).eq("id", userId);
    expect(unitChange.error).toBeNull();
    await page.goto(`/uk/packing/${tripId}`);
    await expect(page.getByText(cached.data!.why!)).toBeVisible();
    await expect(page.getByText("Уночі до 37° — візьми щось тепле на вечір.", { exact: true })).toBeVisible();
    expect((await db.from("outfits").select(columns).eq("trip_id", tripId).order("trip_day")).data).toEqual(before.data);
    expect((await db.from("generation_events").select("id", { count: "exact", head: true }).eq("user_id", userId)).count).toBe(usage.count);
    const note = page.getByText("Уночі до 37° — візьми щось тепле на вечір.", { exact: true });
    // WebKit's scrollIntoViewIfNeeded ignores sticky occlusion when text is inside the viewport.
    // On a short phone the capsule scrolls; its existing clearance must make all note text reachable.
    await note.evaluate(el => el.scrollIntoView({ block: "center" }));
    const noteBox = await note.boundingBox();
    const actionBox = await page.getByRole("link", { name: uk.packing.seeDays, exact: true }).boundingBox();
    expect(noteBox!.y + noteBox!.height).toBeLessThanOrEqual(actionBox!.y);
    // Partial trips display this same saved reasoning.
    const partial = await db.from("trips").update({ end_date: "2026-09-22", occasion_mix: { everyday: 3 } }).eq("id", tripId);
    expect(partial.error).toBeNull();
    await page.reload();
    await expect(page.getByRole("heading", { name: uk.packing.shortfall.title, exact: true })).toBeVisible();
    await expect(page.getByText(cached.data!.why!)).toBeVisible();
  } finally {
    await db.from("profiles").update({ preferences: originalPreferences }).eq("id", userId);
    if (tripId) {
      await db.from("outfits").delete().eq("trip_id", tripId);
      await db.from("trips").delete().eq("id", tripId);
    }
    await db.from("weather_cache").delete().eq("lat", lat).eq("lon", lon).in("day", weatherDates);
  }
});
