export type Tier = "free" | "pro";

/** The three things that spend a model request. See docs/MONETISATION.md §2. */
export type GenerationKind = "drop" | "regenerate" | "styled";

export type Entitlements = {
  tier: Tier;
  /**
   * Rerolls per DAY, across all occasions. null = unlimited.
   *
   * Global rather than per-occasion (user decision, 2026-08-05). Most people
   * care about one occasion on a given day, so a per-occasion allowance is
   * strictest exactly where attention goes and generous where nobody is
   * looking: you could be refused a second Work reroll while holding an unused
   * Evening one you never wanted.
   *
   * The usual objection to a global pool — that it can block an occasion you
   * have not opened yet — does not apply here, because a drop is free on every
   * tier. Tapping a new occasion is always a drop, so the pool only ever meters
   * rerolls.
   */
  regeneratesPerDay: number | null;
  /**
   * How many pieces a closet may hold. null = unlimited.
   *
   * Counts UNARCHIVED items only. Archiving is the user's way to make room —
   * there is no delete path in the product, so counting archived pieces would
   * strand a user at the cap with no way out. It also matches what the number
   * claims: an archived piece is not in your closet.
   *
   * 50 is deliberately well clear of the ~20-30 range where combo coverage
   * thins (PR #15 measured a 21-item closet at 21 combos in winter against 48
   * in summer), so the free tier never experiences a starved stylist — it
   * experiences a full one, with a ceiling.
   */
  closetItems: number | null;
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
 * The free ceiling is four occasion drops plus three rerolls = 7 generations a
 * day, about $0.63/month at $0.003 each and nearer $0.20 in realistic use.
 * **The ceiling is the point** — a free tier needs a worst case you can
 * survive, and this one cannot be raised by adding clothes.
 */
export const FREE: Entitlements = {
  tier: "free",
  regeneratesPerDay: 3,
  closetItems: 50,
  styledLooks: false,
  savedOutfits: 10,
  analytics: false,
  gapAnalysis: false,
  packingMode: false,
};

export const PRO: Entitlements = {
  tier: "pro",
  regeneratesPerDay: null,
  closetItems: null,
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
 * `regeneratesUsed` is the user's total reroll count for their local today,
 * across every occasion.
 *
 * A drop is never metered on any tier: MONETISATION §1 and Decision 4 both say
 * the daily drop is the product, and rationing it is how nobody discovers the
 * magic. That is also what makes a global reroll pool safe — a user can always
 * open any occasion, so the pool can never strand them.
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

  if (e.regeneratesPerDay == null) return { allowed: true, remaining: null };
  const remaining = Math.max(0, e.regeneratesPerDay - input.regeneratesUsed);
  return remaining > 0
    ? { allowed: true, remaining }
    : {
        allowed: false,
        remaining: 0,
        reason: `That's your ${e.regeneratesPerDay} rerolls for today. Pro rerolls without limit.`,
      };
}

/**
 * May this user add another piece?
 *
 * `held` is the number of UNARCHIVED pieces already in the closet — archiving
 * is how a free user makes room, since nothing in the product deletes an item.
 */
export function checkCloset(e: Entitlements, held: number): GenerationCheck {
  if (e.closetItems == null) return { allowed: true, remaining: null };
  const remaining = Math.max(0, e.closetItems - held);
  return remaining > 0
    ? { allowed: true, remaining }
    : {
        allowed: false,
        remaining: 0,
        reason: `A free closet holds ${e.closetItems} pieces. Pro is unlimited — or archive something you no longer wear.`,
      };
}
