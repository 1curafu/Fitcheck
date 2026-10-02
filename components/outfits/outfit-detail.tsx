"use client";
import { useLocale, useTranslations } from "next-intl";
import { useVocab } from "@/lib/i18n/vocab";
import { useRouter, usePathname, Link } from "@/lib/i18n/navigation";

import { useOptimistic, useTransition, type CSSProperties, useEffect, useState, useCallback } from "react";

import { Bookmark, Share } from "lucide-react";
import { toggleWear, setSaved, noteOutfitViewed } from "@/app/[locale]/outfits/[id]/actions";
import { UpgradeSheet } from "@/components/billing/upgrade-sheet";
import { FREE } from "@/lib/billing/tiers";
import { TryAnotherLook } from "./try-another-look";
import { ShareSheet } from "./share-sheet";
import { WeatherAttribution } from "@/components/weather/attribution";
import { Kicker } from "@/components/ui-fitcheck/kicker";
import { wearLabel } from "@/lib/outfits/wear";
import { LookTextRequest } from "@/components/i18n/look-text-request";
import { sameOutfitTextSource, type OutfitText, type TranslationResult } from "@/lib/outfits/text";
import type { OutfitTextSource } from "@/lib/outfits/text";
import type { ShippedLocale } from "@/lib/i18n/locales";
import type { Slot, UiOccasion } from "@/lib/generator/types";

export type DetailPiece = {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  imageUrl: string;
  slot: Slot;
};

export function OutfitDetail({
  outfit: initialOutfit,
  pieces,
  worn,
  saved,
  savedOn,
  styledItemId = null,
}: {
  outfit: {
    textSource: OutfitTextSource;
    textLocale: ShippedLocale;
    textTranslated: boolean;
    id: string;
    lookName: string;
    occasion: string;
    weatherLabel: string;
    reasoning: string | null;
    /** The look's local date (daily drop) or created-at day, for the share card's kicker. Never weather (spec §0 A3). */
    lookDate: string | null;
  };
  pieces: DetailPiece[];
  worn: boolean;
  saved: boolean;
  savedOn?: string;
  /** The piece this look was styled around, when it came from "Style an outfit with this". */
  styledItemId?: string | null;
}) {
  const t = useTranslations("outfit");
  const locale = useLocale();
  const [translation, setTranslation] = useState<OutfitText | null>(null);
  const onTextReady = useCallback((result: TranslationResult) => {
    if (result.locale !== locale) return;
    const text = result.texts.find(row => row.locale === locale && row.id === initialOutfit.id && sameOutfitTextSource(row.source, initialOutfit.textSource));
    if (text) setTranslation(text);
  }, [locale, initialOutfit.id, initialOutfit.textSource]);
  const valid = translation?.locale === locale && sameOutfitTextSource(translation.source, initialOutfit.textSource);
  const base = initialOutfit.textLocale === locale ? initialOutfit : { ...initialOutfit,
    lookName: initialOutfit.textSource.name, reasoning: initialOutfit.textSource.why, textLocale: locale, textTranslated: false };
  const outfit = valid ? { ...base, lookName: translation.name, reasoning: translation.why, textTranslated: translation.translated } : base;
  const label = useVocab();
  const tOccasion = useTranslations("vocab.occasion");
  const occasionLabel = (["everyday", "work", "weekend", "evening"] as string[]).includes(outfit.occasion)
    ? tOccasion(outfit.occasion as UiOccasion) : outfit.occasion;
  const router = useRouter();
  // Optimistic rather than local state: both toggles revalidate this route, so
  // the server value is the truth a moment later. `useState(worn)` would seed
  // once and then ignore it — the button would keep saying whatever the last tap
  // said even if the write failed.
  const [isWorn, showWorn] = useOptimistic(worn);
  const [isSaved, showSaved] = useOptimistic(saved);
  const pathname = usePathname();
  const [saveUpgrade, setSaveUpgrade] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  useEffect(() => () => { setSaveUpgrade(false); setSaveMessage(null); }, [pathname]);
  const [pending, start] = useTransition();
  const [sharing, setSharing] = useState(false);
  // Cache Components preserves this route with React <Activity hidden> rather than unmounting it — leaving with the
  // sheet open would otherwise leave it open on return (the same rule as the edit/remove sheets elsewhere).
  useEffect(() => () => setSharing(false), []);

  /**
   * Record that this look was opened, for the evening wear confirmation.
   *
   * On mount and from the client — not in the route's render — so a prefetch
   * the user never looked at cannot enter the confirmation. Fire-and-forget:
   * nothing on screen depends on it, and a failed stamp must never disturb the
   * look itself.
   */
  useEffect(() => {
    noteOutfitViewed(outfit.id).catch(() => {});
  }, [outfit.id]);

  return (
    // `relative`: the floating Back/⋯ controls are positioned against THIS screen, so they move down with it when
    // the shell's in-flow cookie notice is showing, instead of staying pinned under the notice at the shell's top.
    <div className="relative flex min-h-dvh flex-1 flex-col">
      <LookTextRequest sources={outfit.textTranslated ? [] : [outfit.textSource]} locale={locale} onReady={onTextReady} />
      {/* This screen opens with a full-bleed flat-lay, so it deliberately does
          NOT use `.screen-top` — the stage runs to the top edge and only this
          overlay control is inset. `top-[58px]` was a hard-coded status-bar
          allowance: correct in the installed PWA, a 58px gap in a Safari tab
          where the viewport already clears the clock. */}
      <button
        type="button"
        onClick={() => {
          // `router.back()` alone is a dead control whenever this screen is the
          // first entry in the session — a shared link, a refresh, or a PWA cold
          // start on /outfits/[id]. There is nothing to go back TO, so the tap
          // silently does nothing. Fall back to the screen the look belongs to.
          if (window.history.length > 1) router.back();
          else router.push("/generate");
        }}
        aria-label={t("back")}
        className="absolute left-[18px] top-[calc(env(safe-area-inset-top)+18px)] z-40 grid size-10 place-items-center rounded-full bg-[rgba(20,19,22,0.7)] text-xl text-foreground shadow-[inset_0_0_0_1px_var(--hairline-7)] backdrop-blur-[10px]"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={() => setSharing(true)}
        aria-label={t("share")}
        className="absolute right-[18px] top-[calc(env(safe-area-inset-top)+18px)] z-40 grid size-10 place-items-center rounded-full bg-[rgba(20,19,22,0.7)] text-xl text-foreground shadow-[inset_0_0_0_1px_var(--hairline-7)] backdrop-blur-[10px]"
      >
        <Share size={18} />
      </button>

      <div className="flex-1 overflow-y-auto pb-[130px]">
        {/* :325 — a full-bleed stage, and the SAME stored geometry the stylist
            screen laid out, so tapping a look does not rearrange it. */}
        <div
          data-testid="detail-stage"
          className="surface-stage relative h-[420px]"
        >
          {/* A piece the storage layer could not sign arrives as "" (the page
              maps a missing signed URL to the empty string). React treats
              `<img src="">` as an error rather than a gap, so the flat-lay
              simply goes one piece lighter — the same guard the closet's hero,
              card and goes-with row already carry. */}
          {pieces
            .filter((p) => p.imageUrl)
            .map((p) => {
              const s = p.slot;
              const style: CSSProperties = {
                position: "absolute",
                left: `${s.xPct}%`,
                top: `${s.yPct}%`,
                width: `${s.wPct}%`,
                height: `${s.hPct}%`,
                zIndex: s.z,
                transform: `rotate(${s.rotationDeg}deg)`,
                filter: "drop-shadow(0 14px 18px rgba(0,0,0,.55))",
              };
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p.id}
                  src={p.imageUrl}
                  alt={p.name}
                  className="object-contain"
                  style={style}
                />
              );
            })}
        </div>

        <div className="px-6 pt-2">
          <Kicker>
            {occasionLabel} · {outfit.weatherLabel}
          </Kicker>
          {/* ⚠️ REQUIRED by ODbL — but ONLY when a temperature is actually on
              screen. `weatherLabel` is "" when the look was stored without a
              forecast, and crediting a provider for weather we are not showing
              would be noise, not compliance. */}
          {outfit.weatherLabel && <WeatherAttribution className="mt-1" />}
          <h1 className="mt-2 font-serif text-[34px]/[1.04] text-foreground">{outfit.lookName}</h1>
          {savedOn && <p className="mt-2 text-sm text-muted-foreground">{t("savedOn", { date: savedOn })}</p>}

          {outfit.reasoning && (
            // The Italic Why Rule — the one sentence that is the product. The rust
            // "f" glyph is the One Rust Rule's spend on this screen.
            <div className="my-5 flex items-start gap-3 rounded-[14px] bg-gradient-to-br from-[#201b18] to-[#191518] p-[18px] shadow-[inset_0_0_0_1px_rgba(184,106,71,0.2)]">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand font-serif text-base italic text-canvas">
                f
              </span>
              <p className="font-serif text-lg/[1.45] italic text-value text-pretty">
                {"“"}{outfit.reasoning}{"”"}
              </p>
            </div>
          )}

          <Kicker className="mb-3 block">{t("inLook")}</Kicker>
          <div className="flex flex-col gap-[10px]">
            {pieces.map((p) => (
              // Every piece row is a way into that garment — this is the screen
              // where the user is looking AT the clothes, so it is where "what
              // is that, exactly?" gets asked.
              <Link
                key={p.id}
                href={`/closet/${p.id}`}
                className="flex items-center gap-[14px] rounded-[13px] bg-surface-1 px-[14px] py-[11px] shadow-[inset_0_0_0_1px_var(--hairline-2)]"
              >
                <div className="relative size-[46px] shrink-0 rounded-[10px] bg-surface-3 p-[7px]">
                  {/* absolute inset-0 gives object-contain a definite box — an
                      <img> sized by its intrinsic dimensions has spilled a row
                      on Safari before (see the closet grid).
                      Guarded on the URL: an unsignable piece would otherwise
                      render `<img src="">`, which React reports as an error. */}
                  {p.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 size-full p-[7px] object-contain"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {p.brand && <Kicker>{p.brand}</Kicker>}
                  <div className="mt-[2px] truncate text-[14.5px] text-value">{p.name}</div>
                </div>
                <div className="shrink-0 whitespace-nowrap text-[11px] text-muted-dim">
                  {label("category", p.category)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Same additive inset as the bottom nav — `pb-[30px]` was a hard-coded
          home-indicator allowance, which is 30px of dead space in a browser tab
          where the toolbar already occupies that band. */}
      {/* Save is secondary to Wear; styled looks keep their full-width retry below. */}
      <div className="sticky bottom-0 z-30 grid grid-cols-[auto_1fr] gap-3 bg-gradient-to-t from-canvas from-60% to-transparent px-[22px] pb-[calc(env(safe-area-inset-bottom)+14px)] pt-[14px]">
        <button
          type="button"
          aria-label={t(isSaved ? "saved" : "save")}
          aria-pressed={isSaved}
          disabled={pending}
          onClick={() =>
            start(async () => {
              setSaveMessage(null);
              showSaved(!isSaved);
              try {
                const result = await setSaved(outfit.id, !isSaved);
                if (result.status === "limit" || result.status === "missing") {
                  showSaved(isSaved);
                  if (result.status === "limit") setSaveUpgrade(true);
                  else setSaveMessage(t("saveFailed"));
                }
              } catch {
                showSaved(isSaved);
                setSaveMessage(t("saveFailed"));
              }
            })
          }
          className="flex min-h-[54px] min-w-24 flex-col items-center justify-center gap-1 rounded-[14px] bg-surface-2 px-3 text-xs shadow-[inset_0_0_0_1px_var(--hairline-7)]"
        >
          <Bookmark
            size={20}
            className={isSaved ? "fill-brand text-brand" : "text-muted-foreground"}
          />
          <span>{t(isSaved ? "saved" : "save")}</span>
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              showWorn(!isWorn);
              await toggleWear(outfit.id);
            })
          }
          className={`min-h-[54px] rounded-[14px] text-[15.5px] font-semibold transition-colors ${
            isWorn ? "bg-surface-2 text-value" : "bg-foreground text-canvas"
          }`}
        >
          {t(wearLabel(isWorn))}
        </button>
        {saveMessage && <p role="status" className="col-span-2 text-center text-xs text-muted-foreground">{saveMessage}</p>}
        {styledItemId && (
          // Spans both columns and centres: a hairline PILL at natural width,
          // not a second filled block. A filled full-width version was tried
          // and read as two competing primaries stacked, and buried the last
          // piece card under the gradient. Secondaries here are pills (Refine).
          <div className="col-span-2 -mt-1">
            <TryAnotherLook itemId={styledItemId} />
          </div>
        )}
      </div>
      <UpgradeSheet open={saveUpgrade} title={t("saveLimitTitle")} body={t("saveLimitBody", { count: FREE.savedOutfits ?? 0 })} onClose={() => setSaveUpgrade(false)} />
      {sharing && <ShareSheet outfit={outfit} pieces={pieces} onClose={() => setSharing(false)} />}
    </div>
  );
}
