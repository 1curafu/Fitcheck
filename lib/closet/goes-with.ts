import { colorHarmonyScore } from "@/lib/generator/color";
import { formalityCoherence } from "@/lib/generator/score";

type Piece = { id: string; category: string; colors: string[]; formality: number | null };

/**
 * The "Goes with" row (Fitcheck.dc.html:641-649).
 *
 * Reuses the generator's own colour-harmony and formality-coherence scoring
 * rather than inventing a second opinion — if these two disagreed, the row would
 * recommend pieces the stylist would never pair, which is worse than an empty
 * row. Deterministic and free: no AI call on this screen.
 *
 * A missing formality reads as 3 (smart casual, the middle of the scale) rather
 * than as a mismatch, so an item the user has not finished tagging is not buried
 * at the bottom of every row forever.
 */
export function goesWith(subject: Piece, closet: Piece[], n = 5): string[] {
  return closet
    .filter(
      (i) =>
        i.id !== subject.id &&
        // A shirt does not "go with" another shirt — the row suggests what
        // completes an outfit, not what replaces the piece.
        i.category !== subject.category &&
        // Fragrance occupies no slot in a look, so it can never be a pairing.
        i.category !== "Fragrance",
    )
    .map((i) => ({
      id: i.id,
      score:
        0.6 * colorHarmonyScore([...subject.colors, ...i.colors]) +
        0.4 * formalityCoherence([subject.formality ?? 3, i.formality ?? 3]),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.id);
}
