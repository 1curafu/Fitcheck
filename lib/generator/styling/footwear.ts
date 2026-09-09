/**
 * How dressy a shoe is, and whether it may sit against a given tailoring cloth.
 *
 * ⚠️ `bulk` was DEAD DATA before this. Every shoe photo has paid the tagger to
 * record it since the item-detail work, the edit sheet offers it and the item
 * screen shows it — and nothing in `lib/generator/` read it. That is the same
 * shape of defect as the original reported bug, where `accent_color` was written
 * by the tagger and read by no scoring rule.
 */

/**
 * The upper's contribution, from the research's ranked hierarchy: patent 5,
 * smooth calfskin on a slim sole 4, suede/nubuck 3, rubber or crepe 2, canvas on
 * a vulcanised sole 1.
 */
const UPPER_BASE: Record<string, number> = {
  Leather: 4,
  "Faux leather": 3,
  Suede: 3,
  Rubber: 2,
  Canvas: 1,
  Nylon: 1,
  Polyester: 1,
};

/**
 * ⚠️ Bulk is a term IN that hierarchy, not a modifier invented here — the
 * research is explicit that a double leather sole reads less formal than a slim
 * one ("bulk adds bulk and reduces formality"). It is why the tagger records it.
 */
const BULK_PENALTY: Record<string, number> = {
  "Low profile": 0,
  Regular: 0.5,
  Chunky: 1.5,
};

/** 1 (canvas on a chunky sole) .. 4 (slim leather). */
export function soleFormality(material: string | null | undefined, bulk: string | null): number {
  const base = UPPER_BASE[material ?? ""] ?? 2;
  return Math.max(1, base - (BULK_PENALTY[bulk ?? "Regular"] ?? 0.5));
}

/**
 * Cloths whose formality a casual sole genuinely offends.
 *
 * ⚠️ The asymmetry is the point, and it is why this is a function of the
 * COUNTERPART rather than a rating of the shoe alone: the research says a
 * rubber-soled sneaker fails against formal worsted wool but is fine against
 * linen, cotton or seersucker. Same shoe, opposite verdict, decided by what it
 * is worn with.
 */
const FORMAL_CLOTH = new Set(["wool", "merino wool", "cashmere", "silk", "tweed"]);

/** Soles casual enough for that to matter. */
const CASUAL_SOLE = new Set(["canvas", "rubber", "nylon", "polyester"]);

/**
 * Whether a shoe may sit against a given tailoring material.
 *
 * `hard` marks the case the research states outright rather than as a
 * preference. ⚠️ Even so it must be applied as a WEIGHT, never as a filter: a
 * closet of one wool trouser and one canvas sneaker has to dress its owner, and
 * `eligibleByCategory`'s rule — a filter may narrow a required slot but never
 * empty one — applies to every rule added here.
 */
export function soleAgainstTailoring(
  soleMaterial: string | null | undefined,
  bulk: string | null,
  counterpartMaterial: string | null | undefined,
): { ok: boolean; hard: boolean } {
  const sole = (soleMaterial ?? "").trim().toLowerCase();
  const cloth = (counterpartMaterial ?? "").trim().toLowerCase();
  if (!CASUAL_SOLE.has(sole) || !FORMAL_CLOTH.has(cloth)) return { ok: true, hard: false };

  // A slim canvas shoe is a different proposition from a chunky one; the
  // research's case is the bulky vulcanised sole against worsted.
  const bulky = (bulk ?? "Regular") !== "Low profile";
  return bulky ? { ok: false, hard: true } : { ok: false, hard: false };
}

type Piece = { category: string; material?: string | null; bulk?: string | null };

/**
 * The footwear signal for one outfit, or `null` when the question does not
 * apply — no shoe, or no lower garment to judge it against.
 *
 * Returns 1 when the shoe suits its counterpart, lower when it does not, and the
 * research's stated case lands lowest.
 */
export function footwearAgainstOutfit(items: readonly Piece[]): number | null {
  const shoe = items.find((i) => i.category === "Shoes");
  // A one-piece is the counterpart in a dress look, exactly as trousers are in a
  // separates one.
  const counterpart =
    items.find((i) => i.category === "Bottoms") ?? items.find((i) => i.category === "One-piece");
  if (!shoe || !counterpart) return null;

  const verdict = soleAgainstTailoring(shoe.material, shoe.bulk ?? null, counterpart.material);
  if (verdict.ok) return 1;
  return verdict.hard ? 0.3 : 0.65;
}
