import { MATERIALS } from "./vocab";

/**
 * Maps a legacy free-text material onto the constrained vocabulary.
 *
 * Longest-match-first so "merino wool" wins over "wool" and "faux leather" over
 * "leather" — the reverse would quietly downgrade every merino piece and turn
 * every vegan one into leather. "Unknown" was a fabrication written by the old
 * item-detail save path and is not a material, so it becomes null.
 *
 * A blend ("Polyester, Viscose") resolves to whichever listed fibre appears
 * first in the string by this rule; a blend's behaviour generally follows its
 * dominant fibre, and the vocabulary is single-select by design.
 */
export function normalizeMaterial(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (!s || s === "unknown") return null;

  const byLength = [...MATERIALS].sort((a, b) => b.length - a.length);
  const hit = byLength.find((m) => m !== "Other" && s.includes(m.toLowerCase()));
  return hit ?? "Other";
}
