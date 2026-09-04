/**
 * Rated colour pairings, 0–5.
 *
 * 5 = repeatedly named "classic" across ≥2 sources · 4 = explicitly endorsed by
 * one strong source, uncaveated · 3 = works but sources attach a condition ·
 * 2 = "bold"/advanced, not a default · 1 = actively discouraged.
 *
 * ⚠️ THESE NUMBERS ARE SYNTHESIS, NOT TRANSCRIPTION. No source publishes a
 * literal 0–5 table; the research derived them from qualitative verdicts and
 * cited the basis for each. They are the most reviewable part of this system —
 * if a rating looks wrong to someone who dresses well, it probably is. Change it
 * here, in one place, and the whole generator moves.
 *
 * ⚠️ Absent means UNRESEARCHED, not mediocre. `pairingRating` returns null and
 * the caller drops the term. Filling ~700 unevidenced cells with a default 3
 * would bury the ~60 that carry real evidence, which is the opposite of the point.
 *
 * Keys are `"a|b"` with the two names SORTED, because the research found pairing
 * to be direction-agnostic for year-round colours. The genuine directional
 * asymmetry — white trousers are summer, navy trousers are year-round — lives in
 * `WARM_WEATHER_ONLY` in ./colour-table.ts, as a season gate rather than as a
 * doubling of this table from ~861 cells to 1,722.
 *
 * Source: `docs/research/fit-check-research-round2-raw.md` §D2.
 */
export const PAIRING_RATINGS: Record<string, number> = {
  // (a) Neutral × neutral
  "navy|white": 5,
  "grey|navy": 5,
  "cream|navy": 4,
  "brown|navy": 4,
  "camel|navy": 5,   // was 4 — named classic in BOTH documents
  "navy|tan": 5,     // was 4 — same
  "charcoal|navy": 3,
  // CONTESTED — sources actively disagree; rated low-middling so it is never
  // chosen over an evidenced pair, and never banned either.
  "black|navy": 3,
  "black|white": 5,
  "black|grey": 5,
  "black|charcoal": 4,
  "beige|black": 4,
  "black|camel": 4,
  "black|tan": 4,
  // CONTESTED, same shape as black|navy.
  "black|brown": 3,
  "brown|grey": 4,
  "beige|brown": 5,
  "brown|taupe": 5,
  "brown|cream": 5,
  "brown|white": 5,
  "grey|white": 5,
  "cream|grey": 5,   // was 4 — named classic in BOTH documents
  "grey|ivory": 4,
  "camel|grey": 4,
  "grey|tan": 4,
  "beige|grey": 4,
  "charcoal|grey": 3,
  // The near-miss: two whites without a value or hue gap read unintentional.
  "cream|white": 3,
  "ivory|white": 3,
  "beige|taupe": 4,
  "beige|khaki": 4,
  "khaki|taupe": 4,
  "navy|stone": 5,   // was 4 — named classic in BOTH documents
  "grey|stone": 4,
  "camel|chocolate": 4,
  "brown|camel": 4,
  // From `fitcheck-r1-ext.md` §2.1, a second rated table not used when this file
  // was first written. Same 0-5 scale, same direction-agnostic sorted keys.
  "beige|navy": 5,
  "cream|sand": 4,
  "cream|taupe": 4,
  "beige|olive": 4,
  "olive|sand": 4,
  "beige|forest": 4,
  "forest|sand": 4,
  // (b) Neutral × accent
  "burgundy|navy": 5,
  "navy|red": 4,
  "mustard|navy": 4,
  "navy|olive": 3,
  "forest|navy": 3,
  "navy|orange": 3,
  "navy|pink": 3,
  "navy|purple": 3,
  "lavender|navy": 3,
  "navy|teal": 3,
  "burgundy|grey": 5,
  "grey|red": 4,
  "grey|mustard": 4,
  "grey|olive": 4,
  "forest|grey": 4,
  "grey|pink": 5,
  "grey|teal": 4,
  "brown|olive": 5,
  "brown|burgundy": 4,
  "brown|maroon": 4,
  "brown|mustard": 5,
  "brown|rust": 4,
  "brown|orange": 4,
  "brown|teal": 4,
  "brown|forest": 4,
  "camel|rust": 4,
  "camel|terracotta": 4,
  "rust|tan": 4,
  "red|white": 4,
  "teal|white": 4,
  "black|burgundy": 4,
  "black|pink": 3,
  // (c) Accent × accent — only pairs sources actually discuss.
  // ⚠️ blue|orange is the flagship generic-vs-clothing disagreement: colour
  // theory calls it a strong complementary pair; every clothing source gates it
  // on muting. Rated for the MUTED reading the vocabulary's names imply
  // (`rust`/`terracotta` rather than a saturated orange).
  "blue|orange": 3,
  "green|red": 2,
  // ⚠️ transcription fix: the research wrote "teal + burnt orange", and
  // `burnt` is not a vocabulary colour (COLOR_NAMES has `orange`, not
  // `burnt`/`burnt orange`). Caught by the "every key is a real vocabulary
  // colour" test below — fixed to the vocabulary term it actually refers to.
  "orange|teal": 3,
  "mustard|teal": 4,
  "pink|teal": 4,
  "rust|teal": 3,
  "green|pink": 3,
  "burgundy|olive": 3,
  "burgundy|mustard": 3,

  // Slash-pair sweep against §D2: rows written as "a + b/c" (or "a/b + c/d")
  // where only one expansion had been encoded. Each key below is a genuinely
  // new combination from an existing rated row — not a new inference.
  "ivory|navy": 4,        // "navy + cream/ivory" — navy|cream already present
  "tan|terracotta": 4,    // "camel/tan + rust/terracotta" — the other 3 of 4 already present
  "burgundy|forest": 3,   // "burgundy + olive/forest" — burgundy|olive already present
  // "beige/cream + coral/pink" — all four combinations were absent.
  "beige|coral": 3,
  "beige|pink": 3,
  "coral|cream": 3,
  "cream|pink": 3,
};

function key(a: string, b: string): string {
  return [a.trim().toLowerCase(), b.trim().toLowerCase()].sort().join("|");
}

/** The rating for one unordered pair, or null when the research had no evidence. */
export function pairingRating(a: string, b: string): number | null {
  if (a.trim().toLowerCase() === b.trim().toLowerCase()) return null; // a colour with itself is not a pairing
  return PAIRING_RATINGS[key(a, b)] ?? null;
}

/**
 * The outfit's mean rating over every pair that HAS a rating, normalised 0..1.
 *
 * Unrated pairs are skipped rather than defaulted, so a wardrobe of unresearched
 * colours is never punished for the research's gaps — it simply gets no opinion
 * from this term, and the other signals decide.
 */
export function pairingScore(colours: string[]): number | null {
  const seen = [...new Set(colours.map((c) => c.trim().toLowerCase()))];
  const rated: number[] = [];
  for (let i = 0; i < seen.length; i++) {
    for (let j = i + 1; j < seen.length; j++) {
      const r = pairingRating(seen[i], seen[j]);
      if (r != null) rated.push(r);
    }
  }
  if (!rated.length) return null;
  // ⚠️ (mean - 1) / 4, NOT mean / 5. Dividing by 5 gave a rating of 1 — "actively
  // discouraged" — a score of 0.2, i.e. a fifth of full credit for a pairing the
  // research says to avoid. Mapping the scale's floor to 0 makes the bottom
  // actually cost something, and leaves 5 at 1.0 untouched.
  const mean = rated.reduce((a, b) => a + b, 0) / rated.length;
  return (mean - 1) / 4;
}
