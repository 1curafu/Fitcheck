"use client";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";

import { useEffect, useMemo, useRef, useState } from "react";

import { Kicker } from "@/components/ui-fitcheck/kicker";
import type { DetailPiece } from "./outfit-detail";
import { createClient } from "@/lib/supabase/client";
import { getShareState, prepareShare, publishShare, stopSharing } from "@/app/[locale]/outfits/[id]/share-actions";
import { loadFonts, loadImages, renderCard } from "@/lib/share/render";
import { orderPieces, pieceLabel, shareExpiry, shareKicker, snapshotPieces, SHARE_IMAGE_FILES } from "@/lib/share/snapshot";
import type { CardInput, CardTarget } from "@/lib/share/card-layout";
import type { UiOccasion } from "@/lib/generator/types";
import { formatShortDate } from "@/lib/i18n/format";

type ShareOutfit = { id: string; lookName: string; occasion: string; reasoning: string | null; lookDate: string | null };
type ShareLink = { token: string; readyAt: string | null; purgingAt?: string };

/**
 * Starts a clipboard write INSIDE the tap, with the text still pending. Safari allows a clipboard write only during a
 * user gesture, and the link exists only seconds later; a ClipboardItem holding a promise is the supported way to
 * bridge that. Without ClipboardItem it waits for the text and writes it (fine in Chrome and Firefox).
 */
function copyWhenReady(text: Promise<string>): Promise<boolean> {
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      const blob = text.then((t) => new Blob([t], { type: "text/plain" }));
      blob.catch(() => {}); // a failed link must not surface as an unhandled rejection
      const item = new ClipboardItem({ "text/plain": blob });
      return navigator.clipboard.write([item]).then(() => true, () => false);
    }
  } catch { /* fall through */ }
  return text.then(
    (t) => (navigator.clipboard?.writeText ? navigator.clipboard.writeText(t).then(() => true, () => false) : false),
    () => false,
  );
}

/** For browsers without the async clipboard API (older iOS, some in-app browsers). */
function copyBySelection(text: string): boolean {
  if (typeof document.execCommand !== "function") return false;
  const area = document.createElement("textarea");
  area.value = text;
  area.readOnly = true;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try { return document.execCommand("copy"); } catch { return false; } finally { area.remove(); }
}

export function ShareSheet({ outfit, pieces, onClose }: { outfit: ShareOutfit; pieces: DetailPiece[]; onClose: () => void }) {
  const locale = useLocale();
  const day = (d: Date) => formatShortDate(d, locale);
  const t = useTranslations("share");
  const tRoot = useTranslations();
  const tOccasion = useTranslations("vocab.occasion");
  const router = useRouter();
  const [target, setTarget] = useState<"story" | "post">("story");
  const [showBrands, setShowBrands] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "link" | "stop">(null);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [link, setLink] = useState<ShareLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const assets = useRef<Promise<{ fonts: Awaited<ReturnType<typeof loadFonts>>; images: Map<number, HTMLImageElement | null> }> | null>(null);
  const blobs = useRef(new Map<string, Blob>());
  const previewGen = useRef(0);

  const ordered = useMemo(() => orderPieces(pieces).slice(0, 8), [pieces]);
  const anyBrand = useMemo(() => ordered.some((p) => Boolean(p.brand?.trim())), [ordered]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);
  // Labels come from the SAME rules as the server snapshot (trimmed brands, blank → none), so the card and the link
  // page list can never disagree (Review Focus 1).
  const card = (brands: boolean): CardInput => {
    const labels = snapshotPieces(ordered.map((p) => ({ id: p.id, name: p.name, brand: p.brand, category: p.category })), brands);
    return {
      title: outfit.lookName, why: outfit.reasoning,
      kicker: shareKicker((["everyday", "work", "weekend", "evening"] as string[]).includes(outfit.occasion)
        ? tOccasion(outfit.occasion as UiOccasion) : outfit.occasion, outfit.lookDate, locale),
      footer: t("cardFooter"),
      pieces: ordered.map((p, i) => ({ n: i + 1, label: pieceLabel(labels[i]), slot: p.slot })),
    };
  };
  const loadAssets = () => {
    assets.current ??= Promise.all([loadFonts(), loadImages(ordered.map((p, i) => ({ n: i + 1, url: p.imageUrl })))])
      .then(([fonts, images]) => {
        if (![...images.values()].some(Boolean)) throw new Error("SHARE_NO_PHOTOS");
        return { fonts, images };
      })
      .catch((e) => { assets.current = null; throw e; }); // a retry must not reuse a rejected load
    return assets.current;
  };
  const draw = async (t: CardTarget, brands: boolean) => {
    const key = `${t}:${brands}`;
    const cached = blobs.current.get(key);
    if (cached) return cached;
    const { fonts, images } = await loadAssets();
    const blob = await renderCard(t, card(brands), images, fonts);
    blobs.current.set(key, blob);
    return blob;
  };

  useEffect(() => { getShareState(outfit.id).then(setLink).catch(() => {}); }, [outfit.id]);

  useEffect(() => {
    // The preview for the PREVIOUS target/brands is cleared in the toggle handlers below, as part of the same user
    // event — not synchronously here, which react-hooks/set-state-in-effect (rightly) flags. `previewGen` guards an
    // out-of-order resolution (a slow "story" draw finishing after the user already switched to "post") from
    // clobbering a newer preview.
    const myGen = ++previewGen.current;
    let url: string | null = null;
    draw(target, showBrands).then((blob) => {
      if (previewGen.current !== myGen) return;
      url = URL.createObjectURL(blob);
      setPreview(url);
      setFailed(false);
    }).catch(() => { if (previewGen.current === myGen) { setFailed(true); setMessage(t("photosFailed")); } });
    return () => { if (url) URL.revokeObjectURL(url); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, showBrands]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const fileName = `fitcheck-${outfit.lookName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${target}.jpg`;
  const shareUrl = link?.readyAt && !link.purgingAt ? `${window.location.origin}/l/${link.token}` : null;

  // No await before navigator.share: iOS allows it only close to the tap (spec §0 A6). The blob is the cached preview.
  function shareImage() {
    const blob = blobs.current.get(`${target}:${showBrands}`);
    if (!blob) return;
    const file = new File([blob], fileName, { type: "image/jpeg" });
    if (navigator.canShare?.({ files: [file] })) {
      navigator.share({ files: [file], title: outfit.lookName }).catch((e) => { if (e?.name !== "AbortError") setMessage(t("openFailed")); });
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
  }

  async function createLink() {
    setBusy("link"); setMessage(null); setCopyError(null);
    let settle!: { ok: (url: string) => void; fail: () => void };
    const url = new Promise<string>((ok, fail) => { settle = { ok, fail: () => fail(new Error("no link")) }; });
    // Synchronously, before any await: this is still the user's tap.
    const copying = copyWhenReady(url);
    try {
      const prepared = await prepareShare({ outfitId: outfit.id, showBrands });
      if (prepared.status === "limited") { settle.fail(); setMessage(tRoot(prepared.message, prepared.values)); return; }
      const bucket = createClient().storage.from("shares");
      const targets: CardTarget[] = ["story", "post", "preview"];
      for (const [i, name] of SHARE_IMAGE_FILES.entries()) {
        const { error } = await bucket.upload(`${prepared.token}/${name}`, await draw(targets[i], showBrands),
          { contentType: "image/jpeg", upsert: true, cacheControl: "60" });
        if (error) throw error;
      }
      const published = await publishShare(prepared.token);
      if (published.status === "error") { settle.fail(); setMessage(tRoot(published.message)); return; }
      setLink({ token: prepared.token, readyAt: new Date().toISOString() });
      settle.ok(`${window.location.origin}/l/${prepared.token}`);
      if (await copying) setCopied(true);
    } catch {
      settle.fail();
      setMessage(t("createFailed"));
      assets.current = null;
      router.refresh(); // signed image URLs expire; a fresh render gets new ones
    } finally { setBusy(null); }
  }

  function shareLink() {
    if (!shareUrl) return;
    if (navigator.share) navigator.share({ url: shareUrl, title: outfit.lookName }).catch(() => {});
    else copyLink();
  }
  async function copyLink() {
    if (!shareUrl) return;
    setCopyError(null);
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(shareUrl); ok = true; }
    } catch { /* fall through to the selection copy */ }
    if (!ok) ok = copyBySelection(shareUrl);
    if (ok) setCopied(true);
    else setCopyError(t("copyFailed"));
  }

  async function stop() {
    if (!link) return;
    setBusy("stop"); setMessage(null);
    try {
      const res = await stopSharing(link.token);
      if (res.status === "error") {
        setMessage(tRoot(res.message));
        setLink({ ...link, readyAt: null, purgingAt: new Date().toISOString() });
      } else setLink(null);
    } catch {
      setMessage(t("stopFailed"));
      getShareState(outfit.id).then(setLink).catch(() => {});
    } finally { setBusy(null); }
  }

  const locked = Boolean(busy);
  return (
    <>
      <button type="button" aria-label={t("close")} disabled={locked} onClick={onClose}
        className="fixed inset-0 z-[60] bg-[rgba(6,6,8,0.5)] backdrop-blur-[1.5px]" />
      <div role="dialog" aria-modal="true" aria-labelledby="share-title" style={{ maxWidth: 440 }}
        className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-h-[92dvh] overflow-y-auto rounded-t-[22px] border-t border-[rgba(237,230,216,0.12)] bg-surface-2 px-[22px] pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3.5">
        <div className="mx-auto mb-4 h-1 w-[34px] rounded-full bg-faint" />
        <Kicker className="block">{t("kicker")}</Kicker>
        <h2 id="share-title" className="mt-1.5 font-serif text-[24px]/[1.15] text-foreground">{t("title")}</h2>

        <div className="mt-4 flex gap-2" role="radiogroup" aria-label={t("format")}>
          {(["story", "post"] as const).map((format) => (
            <button key={format} type="button" role="radio" aria-checked={target === format} disabled={locked}
              onClick={() => { if (target === format) return; setPreview(null); setTarget(format); }}
              className={`min-h-[44px] flex-1 rounded-[12px] text-[14px] ${target === format ? "bg-foreground text-canvas" : "bg-surface-3 text-muted-foreground"}`}>
              {t(format)}
            </button>
          ))}
        </div>

        <div className="mt-4 grid place-items-center">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={t("cardAlt", { lookName: outfit.lookName })} className="max-h-[44dvh] rounded-[14px] shadow-[inset_0_0_0_1px_var(--hairline-7)]" />
          ) : (
            <div className="h-[44dvh] w-full animate-pulse rounded-[14px] bg-surface-3" />
          )}
        </div>

        <div className="mt-4 flex min-h-[44px] items-center justify-between text-[14px] text-foreground">
          <span id="brands-label">{t("showBrands")}</span>
          <button type="button" role="switch" aria-checked={showBrands} aria-labelledby="brands-label" disabled={locked || !anyBrand}
            aria-describedby={anyBrand ? undefined : "brands-hint"}
            onClick={() => { setPreview(null); setShowBrands((v) => !v); }}
            className={`h-7 w-12 rounded-full ${showBrands ? "bg-foreground" : "bg-surface-3"}`}>
            <span className={`block size-6 rounded-full bg-canvas transition-transform ${showBrands ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>

        {!anyBrand && <p id="brands-hint" className="text-[12px] text-muted-foreground">{t("brandHint")}</p>}

        {message && <p role="status" className="mt-2 text-[13px] text-foreground">{message}</p>}

        <button type="button" disabled={locked || failed || !preview} onClick={shareImage}
          className="mt-4 min-h-[48px] w-full rounded-[12px] bg-foreground px-4 text-[15px] font-semibold text-canvas disabled:opacity-60">
          {t("shareImage")}
        </button>
        <button type="button" disabled={locked || failed || Boolean(link?.purgingAt)} onClick={createLink}
          className="mt-3 min-h-[48px] w-full rounded-[12px] bg-surface-3 px-4 text-[15px] text-foreground disabled:opacity-60">
          {busy === "link" ? t("creating") : shareUrl ? t("updateLink") : t("createLink")}
        </button>
        <p className="mt-2 text-center text-[12px] text-muted-foreground">{t("privacy")}</p>

        {shareUrl && link?.readyAt && (
          <div className="mt-4 rounded-[12px] bg-surface-3 px-4 py-3">
            <span data-testid="share-url" className="block select-all truncate text-[13px] text-foreground">{shareUrl}</span>
            <span className="mt-1 block text-[12px] text-muted-foreground">{t("expires", { date: day(shareExpiry(link.readyAt)) })}</span>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={shareLink} disabled={locked} className="min-h-[44px] flex-1 rounded-[10px] bg-foreground text-[14px] font-semibold text-canvas">{t("share")}</button>
              <button type="button" onClick={copyLink} disabled={locked} className="min-h-[44px] flex-1 rounded-[10px] bg-surface-2 text-[14px] text-foreground" aria-live="polite">{copied ? t("copied") : t("copy")}</button>
            </div>
            {copyError && <p role="status" className="mt-2 text-[12px] text-foreground">{copyError}</p>}
            <button type="button" onClick={stop} disabled={locked}
              className="mt-2 min-h-[44px] w-full text-[13px] text-muted-foreground underline underline-offset-4">
              {busy === "stop" ? t("stopping") : t("stop")}
            </button>
          </div>
        )}
        {link?.purgingAt && (
          <div className="mt-4 rounded-[12px] bg-surface-3 px-4 py-3 text-[13px] text-foreground">
            <p>{t("off")}</p>
            <button type="button" onClick={stop} disabled={locked}
              className="mt-2 min-h-[44px] text-muted-foreground underline underline-offset-4">
              {busy === "stop" ? t("finishing") : t("retryCleanup")}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
