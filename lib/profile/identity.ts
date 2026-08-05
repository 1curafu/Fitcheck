/**
 * The DNA swatch tokens, mirrored from `--color-dna-*` in `app/globals.css`.
 *
 * Kept as one named set so the profile hub and the Style DNA card cannot drift
 * apart — a second hard-coded palette somewhere else is exactly how two screens
 * end up disagreeing about what an archetype looks like.
 */
const DNA = {
  cream: "#ede6d8",
  navy: "#2c3a4c",
  camel: "#b89a6a",
  olive: "#6e6f52",
  rust: "#b86a47",
} as const;

/** The four archetypes the onboarding quiz can produce (`lib/onboarding/questions.ts`). */
const PALETTES: Record<string, string[]> = {
  "Old Money": [DNA.cream, DNA.navy, DNA.camel],
  "Smart Casual": [DNA.camel, DNA.olive, DNA.cream],
  Preppy: [DNA.navy, DNA.cream, DNA.rust],
  Streetwear: [DNA.olive, DNA.navy, DNA.rust],
};

/** The full set, for a profile that has not answered the quiz. */
const FALLBACK = Object.values(DNA);

/**
 * One or two letters for the avatar circle.
 *
 * Falls back to the email rather than rendering an empty circle, which reads as
 * a broken image rather than as a person.
 */
export function initials(name: string | null, email: string): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    return words
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("");
  }
  const first = email.replace(/[^a-z0-9]/gi, "")[0];
  return (first ?? "F").toUpperCase();
}

/**
 * A display handle derived from the email's local-part.
 *
 * `profiles` has no `handle` column and adding one needs an edit flow and a
 * uniqueness rule, which belong with the Settings account row rather than here.
 * Isolated in this one function so replacing it later is a one-line change.
 *
 * Plus-addressing and dots are stripped: `first.last+fitcheck@…` reading as
 * `@first.last+fitcheck` looks like a bug, and the suffix leaks that the address
 * was tagged.
 */
export function handleFrom(email: string): string {
  const local = email.split("@")[0] ?? "";
  const cleaned = local.split("+")[0]!.replace(/[^a-z0-9_]/gi, "").toLowerCase();
  return `@${cleaned || "fitcheck"}`;
}

/** Swatches for an archetype; the full DNA set when there is no answer yet. */
export function paletteFor(archetype: string | null): string[] {
  if (!archetype) return FALLBACK;
  return PALETTES[archetype] ?? FALLBACK;
}
