"use server";

import { getActionLocale } from "@/lib/i18n/action-locale";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { signItemImages, displayPath } from "@/lib/storage/signed";
import { fetchForecast } from "@/lib/weather/forecast";
import { laterAdvice } from "@/lib/weather/advice";
import { planningTempFor, rainAheadFor } from "@/lib/weather/planning";
import { readPreferences } from "@/lib/profile/preferences";
import { conditionKey } from "@/lib/weather/condition";
import { personalBand, planningTemp } from "@/lib/generator/rules";
import { buildCandidates, emptiedByNogos, type CandidateItem } from "@/lib/generator/candidates";
import { rankTopN } from "@/lib/generator/rank";
import { currentSeason } from "@/lib/generator/season";
import { rerank } from "@/lib/generator/rerank";
import { layoutForLook, staggerOrder } from "@/lib/generator/layout";
import { localDateFor } from "@/lib/outfits/local-date";
import { assertCanGenerate, noteGeneration, QuotaExceededError } from "@/lib/outfits/quota";
import { predictOccasion } from "@/lib/outfits/predict-occasion";
import { pinItem, styledLookName, shortlistFor, STYLED_LOOKS } from "@/lib/outfits/styled";
import {
  loadStyledLooks,
  saveStyledLooks,
  clearStyledLooks,
  loadStyledPieceIds,
} from "@/lib/outfits/styled-store";
import { resolveLocation } from "@/lib/weather/location";
import type { LookDraft, LookPiece, WeatherPayload } from "@/lib/generator/types";
import { stylistInputFor, toCandidateItem } from "@/lib/generator/from-row";
import { storedLooksBlocked } from "@/lib/generator/nogos";
import { readNogos } from "@/lib/onboarding/style-profile";
import type { MessageKey } from "@/lib/i18n/keys";

export type StyleResult =
  | { status: "ok"; outfitIds: string[] }
  | { status: "limited"; message: MessageKey }
  | { status: "empty"; message: MessageKey }
  | { status: "error"; message: MessageKey };

/**
 * "Style an outfit with this" (Fitcheck.dc.html:654).
 *
 * Pins the piece, runs the deterministic pipeline, spends ONE text call to name
 * and explain the result, then persists it keyed by (user, item, local day) so a
 * second tap the same day is a free read.
 *
 * This does not contradict Decision 5. That decision says never pay twice for a
 * question already answered — which is why the daily drop caches. "What goes
 * with this piece?" is a different question from "what should I wear today?",
 * so it gets its own answer, cached the same way.
 *
 * The alternative readings were measured and rejected; see the plan
 * `todo/2026-07-24-item-detail-rebuild.md`.
 */
export async function styleWithItem(
  itemId: string,
  opts?: { regenerate?: boolean },
): Promise<StyleResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { status: "error", message: "item.style.notSignedIn" };

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "archetype, formality_min, formality_max, nogos, occasions, location_lat, location_lon, location_label, location_source, location_timezone, preferences",
      )
      .eq("id", user.id)
      .single();

    const { data: itemsRaw } = await supabase
      .from("items")
      .select("*")
      .eq("user_id", user.id)
      .eq("archived", false);
    const items = itemsRaw ?? [];
    const subject = items.find((i) => i.id === itemId);
    if (!subject) return { status: "error", message: "item.style.pieceNotFound" };

    // Fragrance occupies no slot in a look, so there is nothing to build around.
    if (subject.category === "Fragrance") {
      return { status: "empty", message: "item.style.fragrance" };
    }

    const now = new Date();
    // The date key comes from the PROFILE timezone, not the forecast's, so the
    // cache can be checked without a network call — the same zone `toggleWear`
    // and `predictDefaultOccasion` use.
    const today = localDateFor(now, profile?.location_timezone ?? "UTC");

    // THE CACHE. Checked before the quota is touched and before any I/O beyond
    // this one indexed lookup — re-opening an answer you already have must never
    // cost anything.
    // A regenerate deliberately skips the cache — that is the whole point of
    // the control. Everything else is a free read, per Decision 5.
    const cached = opts?.regenerate ? [] : await loadStyledLooks(user.id, itemId, today);
    // A cached set is served without rebuilding, so a companion retagged Ripped/Large/Fitted after styling would
    // stay in the look all day. Re-check it; the styled piece itself is exempt (the user chose it). A set that now
    // breaks a no-go is rebuilt exactly as a regenerate would (the flat Pro gate below still applies).
    const userNogos = readNogos(profile?.nogos);
    let cachedBreaksNogo = false;
    if (cached.length && userNogos.length) {
      const { data: pieceRows } = await supabase.from("outfit_items").select("outfit_id, item_id").in("outfit_id", cached);
      const cachedLooks = cached.map((id) => ({
        pieces: (pieceRows ?? []).filter((r) => r.outfit_id === id).map((r) => ({ itemId: r.item_id as string })),
      }));
      cachedBreaksNogo = storedLooksBlocked(cachedLooks, new Map(items.map((i) => [i.id, i])), userNogos, [itemId]);
    }
    if (cached.length && !cachedBreaksNogo) return { status: "ok", outfitIds: cached };

    // Checked before the forecast fetch below: a free user is turned away
    // without us paying for I/O they will never see. The occasion is not needed
    // here — a styled look is a flat capability (Pro #2), not a counted meter —
    // and it is resolved a few lines down, in time for the ledger.
    try {
      await assertCanGenerate(user.id, { kind: "styled", today });
    } catch (e) {
      if (e instanceof QuotaExceededError) return { status: "limited", message: "item.style.proReason" };
      throw e;
    }

    const loc = resolveLocation({ profile });
    const f = await fetchForecast(loc.lat, loc.lon);
    const prefs = readPreferences(profile?.preferences);
    const locale = await getActionLocale();
    const advice = laterAdvice(f.hourly, prefs.tempUnit, f.highC, locale);
    const tAdvice = await getTranslations({ locale, namespace: "weather.advice" });
    const tWeather = await getTranslations({ locale, namespace: "weather" });
    const adviceClause = tAdvice(advice.clauseKey);
    const weather: WeatherPayload = {
      tempC: f.tempC,
      feelsLikeC: f.feelsLikeC,
      condition: tWeather(`conditions.${conditionKey(f.conditionId)}`),
      conditionId: f.conditionId,
      cityLabel: loc.label,
      timezone: f.timezone,
      locationOrigin: loc.origin,
      laterSentence: `${tAdvice(advice.leadKey, advice.leadValues)} — ${adviceClause}`,
      adviceClause,
      laterLabel: tWeather("later"),
      hourly: f.hourly,
      tempUnit: prefs.tempUnit,
    };

    // The occasion the app already believes you are dressing for today — the CTA
    // has no picker, and a look styled for the wrong context is worse than one
    // that simply agrees with the rest of the day.
    const occasion = predictOccasion(now, f.timezone, profile?.occasions ?? []);

    /**
     * Pinning, done BEFORE candidate building rather than after.
     *
     * Dropping every rival in the subject's own category means any combo using
     * that category uses THIS piece. Filtering the built list instead would have
     * to survive the 200-combo CAP, and a piece that never made the cut would
     * silently produce "no looks" — the same class of bug as the coverage
     * defect fixed in PR #14.
     */
    const pool = items.filter((i) => i.category !== subject.category || i.id === itemId);
    const candItems: CandidateItem[] = pool.map(toCandidateItem);

    const args = {
      weather: {
        tempC: f.tempC,
        // Rain while the look is WORN, on the same clock as the temperature.
        rain: rainAheadFor(occasion, f.restOfDay),
        // The look is built for the day, not for this minute.
        // Same rule on the styled path: the look is built for the window the
        // chosen occasion is worn in, not for whenever the user tapped.
        highC: planningTempFor(occasion, f.restOfDay, f.tempC),
        lowC: f.lowC,
      },
      season: currentSeason(now),
      excludeItemIds: [],
      maxAccessories: 2,
      maxBags: 1,
      rainGuard: prefs.rainGuard,
      nogos: userNogos,
      // The piece the user asked to style is never removed by their own no-gos; its companions are.
      keepItemIds: [itemId],
    };
    const aesthetic = profile?.archetype ? [profile.archetype] : [];

    // Try the day's own formality band first, then the full scale. A piece
    // dressier or more casual than today's context is still stylable — refusing
    // would be the "hard filter empties a required slot" trap again.
    /**
     * "Try another" must not return what the user just saw.
     *
     * A SOFT penalty, via `Ctx.recentlyShown` — `RECENT_WEIGHT` sinks those
     * pieces without removing them. Deliberately NOT `excludeItemIds`: a hard
     * exclusion was measured and rejected on the daily path (0 combos in winter
     * on a real closet), and here it is worse still, because the pinned piece
     * appears in every candidate and excluding it would empty the list outright.
     */
    const recentlyShown = opts?.regenerate
      ? Array.from(
          new Set(
            (await loadStyledPieceIds(user.id, itemId, today)).filter((id) => id !== itemId),
          ),
        )
      : [];

    let pinned: ReturnType<typeof rankTopN> = [];
    for (const band of [personalBand(occasion, profile), [1, 5] as [number, number]]) {
      const combos = buildCandidates(candItems, { ...args, band });
      const ranked = rankTopN(
        combos,
        // Styling a chosen piece is weather-aware too: the plan only names the
        // daily path, but a look built around your favourite jumper still has
        // to be wearable at today's temperature.
        { aesthetic, band, lean: [], recentlyShown, season: args.season, tempC: planningTemp(args.weather) },
        combos.length,
      );
      pinned = pinItem(ranked, itemId);
      if (pinned.length) break;
    }

    if (!pinned.length) {
      return {
        status: "empty",
        // "Add more pieces" is wrong advice when the user's own no-gos removed the companions they already own.
        message: emptiedByNogos(candItems, { ...args, band: [1, 5] }) ? "item.style.nogos" : "item.style.thinCloset",
      };
    }

    const byId = new Map(items.map((i) => [i.id, i]));
    const tStyle = await getTranslations({ locale, namespace: "item.style" });
    const fallbackName = styledLookName(subject);
    // Diversified, exactly as the daily path does it. A raw slice hands the
    // model twenty variations of one idea, because ranking clusters.
    const shortlist = shortlistFor(pinned);

    const { combos, contested } = stylistInputFor(shortlist, byId);

    const { picks } = await rerank({
      locale,
      contested,
      want: STYLED_LOOKS,
      combos,
      aesthetic,
      occasion,
      weatherLabel: f.condition,
      // The temperature the shortlist was BUILT for, not the current reading.
      tempC: planningTemp(args.weather),
      nowC: f.tempC,
    });

    // One draft per pick, de-duplicated: the model can name the same combo
    // twice, and two identical looks are worse than one.
    const seen = new Set<number>();
    const drafts: LookDraft[] = [];
    for (const pick of picks.length ? picks : [{ combo_index: 0, name: "", why: "" }]) {
      const idx = pick.combo_index ?? 0;
      const chosen = shortlist[idx] ?? shortlist[0];
      if (!chosen) continue;
      const comboKey = chosen.items.map((ci) => ci.id).sort().join("+");
      if (seen.has(idx)) continue;
      seen.add(idx);
      if (drafts.some((d) => d.pieces.map((p) => p.itemId).sort().join("+") === comboKey)) continue;

      const dbItems = chosen.items.map((ci) => byId.get(ci.id)!);
      const signed = await signItemImages(dbItems.map((i) => displayPath(i)));
      const slots = layoutForLook(dbItems.map((d) => ({ category: d.category })));
      const pieces: LookPiece[] = dbItems.map((d, i) => ({
        itemId: d.id,
        category: d.category,
        subcategory: d.subcategory ?? null,
        brand: d.brand ?? null,
        name: d.name ?? null,
        colors: d.colors ?? [],
        cutoutUrl: signed.get(displayPath(d)) ?? "",
        slot: slots[i],
      }));

      drafts.push({
        name: pick.name || tStyle("around", fallbackName.values),
        why: pick.why ?? "",
        pieces,
        anchorIndex: staggerOrder(slots)[0],
      });
    }

    if (!drafts.length) return { status: "error", message: "item.style.failed" };

    // Delete-then-insert, exactly as saveDailyLooks does it: a fresh run may
    // return a different number of looks, and leftovers must not survive
    // beside the new set.
    if (opts?.regenerate || cachedBreaksNogo) await clearStyledLooks(user.id, itemId, today);

    const outfitIds = await saveStyledLooks(user.id, itemId, occasion, today, weather, drafts, locale);
    if (!outfitIds.length) return { status: "error", message: "item.style.saveFailed" };

    // After the model answered AND the write landed. The occasion is known by
    // now, which is why recording is separate from the gate above.
    await noteGeneration(user.id, { kind: "styled", occasion, today });

    return { status: "ok", outfitIds };
  } catch (e) {
    console.error("[styleWithItem] failed:", e);
    return { status: "error", message: "item.style.failed" };
  }
}
