export type Tier = "free" | "pro";

/** The three things that spend a model request. See docs/MONETISATION.md §2. */
export type GenerationKind = "drop" | "regenerate" | "styled";

export type Entitlements = {
  tier: Tier;
  /** Per occasion, per day. null = unlimited. Drops themselves are never metered. */
  regeneratesPerOccasion: number | null;
  /**
   * New pieces per day. null = unlimited.
   *
   * A RATE, deliberately, not a closet cap. The closet is the switching cost,
   * and the generator measurably degrades on a small wardrobe — PR #15 measured
   * a 21-item closet at 21 combos in winter against 48 in summer — so a total
   * cap would sell free users a worse stylist rather than fewer features.
   * Metering the rate smooths cost and gives onboarding a real upgrade moment
   * ("add your whole wardrobe tonight") while a committed free user still
   * reaches 100 items in ten days.
   *
   * ⚠️ Under review: a 50-item total cap for free may replace or accompany this
   * (user, 2026-08-04). If it lands, add a separate `closetItems` field rather
   * than overloading this one — they answer different questions.
   */
  uploadsPerDay: number | null;
  /** "Style an outfit with this" — Pro #2. */
  styledLooks: boolean;
  savedOutfits: number | null;
  /** The Wear Stats SCREEN. The per-item tile on item detail is free. */
  analytics: boolean;
  gapAnalysis: boolean;
  packingMode: boolean;
};

/**
 * The tiers, as data. See docs/MONETISATION.md for the reasoning — in short:
 * meter what costs us money, sell what compounds, and never gate the daily
 * drop, the share card, or the closet.
 *
 * The free ceiling is four occasions × (one drop + one regenerate) = 8
 * generations a day, about $0.72/month at $0.003 each and nearer $0.20 in
 * realistic use. **The ceiling is the point** — a free tier needs a worst case
 * you can survive, and this one does not grow with closet size.
 */
export const FREE: Entitlements = {
  tier: "free",
  regeneratesPerOccasion: 1,
  uploadsPerDay: 10,
  styledLooks: false,
  savedOutfits: 10,
  analytics: false,
  gapAnalysis: false,
  packingMode: false,
};

export const PRO: Entitlements = {
  tier: "pro",
  regeneratesPerOccasion: null,
  uploadsPerDay: null,
  styledLooks: true,
  savedOutfits: null,
  analytics: true,
  gapAnalysis: true,
  packingMode: true,
};

// The pure functions live HERE, not in entitlements.ts, so tests can import them
// without dragging in `server-only` (which does not resolve under jsdom).
// entitlements.ts re-exports them for app code.

/** Unknown input resolves to free: capabilities fail CLOSED. */
export function entitlementsFor(tier: unknown): Entitlements {
  return tier === "pro" ? PRO : FREE;
}

export type GenerationCheck = {
  allowed: boolean;
  /** null = unlimited. Only meaningful for a metered kind. */
  remaining: number | null;
  reason?: string;
};

/**
 * May this user spend a model request right now?
 *
 * `regeneratesUsed` is the count for the ONE occasion being asked about, on the
 * user's local today — never a global total. The allowance is per occasion so
 * that regenerating Work cannot exhaust Evening, and so a user is never blocked
 * on an occasion they have not yet looked at.
 *
 * A drop is never metered on any tier: MONETISATION §1 and Decision 4 both say
 * the daily drop is the product, and rationing it is how nobody discovers the
 * magic.
 */
export function checkGeneration(
  e: Entitlements,
  input: { kind: GenerationKind; regeneratesUsed: number },
): GenerationCheck {
  if (input.kind === "drop") return { allowed: true, remaining: null };

  if (input.kind === "styled") {
    return e.styledLooks
      ? { allowed: true, remaining: null }
      : {
          allowed: false,
          remaining: 0,
          reason: "Building a look around a piece is a Pro feature.",
        };
  }

  if (e.regeneratesPerOccasion == null) return { allowed: true, remaining: null };
  const remaining = Math.max(0, e.regeneratesPerOccasion - input.regeneratesUsed);
  return remaining > 0
    ? { allowed: true, remaining }
    : {
        allowed: false,
        remaining: 0,
        reason: "You've used today's redo for this occasion. Pro regenerates freely.",
      };
}

/**
 * May this user add another piece right now?
 *
 * The wording matters: this is a limit on how fast a wardrobe is added, never
 * on how large it may be. A message that reads like "your closet is full" would
 * tell users the opposite of the truth and discourage the very thing that makes
 * the product better for them.
 */
export function checkUploads(e: Entitlements, addedToday: number): GenerationCheck {
  if (e.uploadsPerDay == null) return { allowed: true, remaining: null };
  const remaining = Math.max(0, e.uploadsPerDay - addedToday);
  return remaining > 0
    ? { allowed: true, remaining }
    : {
        allowed: false,
        remaining: 0,
        reason: `That's ${e.uploadsPerDay} pieces added today. More tomorrow, or add your whole wardrobe at once with Pro.`,
      };
}
