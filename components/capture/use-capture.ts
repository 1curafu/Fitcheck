"use client";

import { useEffect, useState } from "react";
import { processImage, blobToBase64 } from "@/lib/images/process";
import { uploadAndTag, confirmItem } from "@/app/closet/upload/actions";
import type { Tags } from "@/lib/ai/tagging-schema";

export type Draft = {
  imagePath: string;
  cutoutPath: string;
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
      const { original, cutout } = await processImage(file);
      const [originalB64, cutoutB64] = await Promise.all([
        blobToBase64(original),
        blobToBase64(cutout),
      ]);
      const res = await uploadAndTag({ originalB64, cutoutB64, mediaType: "image/png" });
      setDraft({
        imagePath: res.imagePath,
        cutoutPath: res.cutoutPath,
        cutoutUrl: URL.createObjectURL(cutout),
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

  function updateDraft(patch: Partial<Draft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
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
      await confirmItem({
        imagePath: draft.imagePath,
        cutoutPath: draft.cutoutPath,
        name: draft.name || null,
        brand: draft.brand || null,
        tags: draft.tags,
      });
      options?.onSaved?.();
      setDraft(null);
      setPhase("aim");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return { phase, draft, error, saving, capture, updateDraft, updateTags, toggleSeason, save };
}
