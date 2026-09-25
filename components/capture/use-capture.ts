"use client";

import { useEffect, useState } from "react";
import { processImage, blobToBase64 } from "@/lib/images/process";
import { uploadAndTag, confirmItem, discardDraft } from "@/app/closet/upload/actions";
import { rotateBlob } from "@/lib/images/rotate";
import { encodeCutout } from "@/lib/images/encode";
import { encodeThumb } from "@/lib/images/thumb";
import { THUMB_MAX_PX } from "@/lib/images/options";
import type { Rotation, Tags } from "@/lib/ai/tagging-schema";

export type Draft = {
  itemId: string;
  imagePath: string;
  cutoutPath: string;
  thumbPath: string | null;
  /** The uploaded cutout, unrotated. `cutoutUrl` always shows it turned by `rotation`. */
  baseCutout: Blob;
  rotation: Rotation;
  cutoutUrl: string;
  name: string;
  brand: string;
  tags: Tags;
};

export type CapturePhase = "aim" | "removing" | "confirm";

export function useCapture(options?: { onSaved?: () => void }) {
  const [phase, setPhase] = useState<CapturePhase>("aim");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Free the object URL when it's replaced by a new capture or on unmount.
  useEffect(() => {
    const url = draft?.cutoutUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [draft?.cutoutUrl]);

  async function capture(file: File) {
    setError(null);
    setPhase("removing");
    try {
      const { original, cutout, cutoutMediaType, thumb, thumbMediaType } = await processImage(file);
      const [originalB64, cutoutB64, thumbB64] = await Promise.all([
        blobToBase64(original),
        blobToBase64(cutout),
        thumb ? blobToBase64(thumb) : Promise.resolve(null),
      ]);
      const res = await uploadAndTag({
        originalB64,
        cutoutB64,
        mediaType: cutoutMediaType,
        thumbB64,
        thumbMediaType,
      });
      if (res.status === "limited") {
        setError(res.message);
        setPhase("aim");
        return;
      }
      const shown = await rotateBlob(cutout, res.rotation);
      setDraft({
        itemId: res.itemId,
        imagePath: res.imagePath,
        cutoutPath: res.cutoutPath,
        thumbPath: res.thumbPath,
        baseCutout: cutout,
        rotation: res.rotation,
        cutoutUrl: URL.createObjectURL(shown),
        name: res.tags.subcategory,
        brand: "",
        tags: res.tags,
      });
      setPhase("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Capture failed");
      setPhase("aim");
    }
  }

  /**
   * Retake: drop the draft and go back to the viewfinder.
   *
   * ⚠️ **The UI resets FIRST, and the cleanup is best-effort.** The user has
   * already decided this capture is wrong; making them wait on a storage
   * round-trip — or worse, stranding them on the screen they rejected because
   * the delete failed — would be a worse bug than the leak it is tidying.
   * `scripts/sweep-orphan-uploads.ts` remains the backstop for anything that
   * fails here, and for the paths this can never reach: crashes, closed tabs,
   * dead connections.
   */
  async function discard() {
    const abandoned = draft;
    setDraft(null);
    setPhase("aim");
    setError(null);
    if (!abandoned) return;

    try {
      await discardDraft([abandoned.imagePath, abandoned.cutoutPath, abandoned.thumbPath]);
    } catch {
      // Swept later rather than surfaced now — see above.
    }
  }

  function updateDraft(patch: Partial<Draft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  }

  async function rotate() {
    if (!draft) return;
    const next = ((draft.rotation + 90) % 360) as Rotation;
    const shown = await rotateBlob(draft.baseCutout, next);
    setDraft((d) => (d ? { ...d, rotation: next, cutoutUrl: URL.createObjectURL(shown) } : d));
  }

  function updateTags(patch: Partial<Tags>) {
    setDraft((d) => (d ? { ...d, tags: { ...d.tags, ...patch } } : d));
  }

  function toggleSeason(s: Tags["seasons"][number]) {
    setDraft((d) => {
      if (!d) return d;
      const cur = d.tags.seasons;
      const next = cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s];
      return next.length ? { ...d, tags: { ...d.tags, seasons: next } } : d;
    });
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      let rotated = null;
      if (draft.rotation !== 0) {
        const { blob, mediaType } = await encodeCutout(await rotateBlob(draft.baseCutout, draft.rotation));
        const thumb = await encodeThumb(blob, THUMB_MAX_PX);
        rotated = {
          cutoutB64: await blobToBase64(blob),
          mediaType,
          thumbB64: thumb ? await blobToBase64(thumb.blob) : null,
          thumbMediaType: thumb?.mediaType ?? null,
        };
      }
      const result = await confirmItem({
        itemId: draft.itemId,
        imagePath: draft.imagePath,
        cutoutPath: draft.cutoutPath,
        thumbPath: draft.thumbPath,
        name: draft.name || null,
        brand: draft.brand || null,
        tags: draft.tags,
        rotated,
      });
      if (result.status === "limited") {
        setError(result.message);
        return;
      }
      options?.onSaved?.();
      setDraft(null);
      setPhase("aim");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return { phase, draft, error, saving, capture, discard, updateDraft, updateTags, toggleSeason, rotate, save };
}
