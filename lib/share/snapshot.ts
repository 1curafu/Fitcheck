/** Pure share helpers used by BOTH the browser card and the server snapshot, so their numbering can never drift. */

export type SnapshotPiece = { n: number; name: string; category: string; brand: string | null };

export const SHARE_IMAGE_FILES = ["story.jpg", "post.jpg", "og.jpg"] as const;
export const MAX_SHARE_PIECES = 8;
export const SHARE_CAP = 100;
export const SHARE_TTL_DAYS = 30;
/** Mirrored by check constraints in migration 20260928092000: clients can write look_shares directly, and the row is public. */
export const SHARE_LIMITS = { lookName: 120, reasoning: 1000, occasion: 40, pieceName: 80, brand: 60, piecesBytes: 8192 } as const;

/** Clips by code point (what Postgres char_length counts), so an emoji is never split. */
export function clipText(text: string, max: number): string {
  const chars = Array.from(text);
  return chars.length <= max ? text : chars.slice(0, max).join("");
}

const READING_ORDER: Record<string, number> = { Outerwear: 0, "One-piece": 1, Tops: 1, Bottoms: 2, Shoes: 3 };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TOKEN = /^[A-Za-z0-9_-]{22}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function orderPieces<T extends { id: string; category: string }>(pieces: T[]): T[] {
  const rank = (c: string) => READING_ORDER[c] ?? 9;
  return [...pieces].sort((a, b) => rank(a.category) - rank(b.category) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function snapshotPieces(
  pieces: { id: string; name: string; brand: string | null; category: string }[],
  showBrands: boolean,
): SnapshotPiece[] {
  return orderPieces(pieces).slice(0, MAX_SHARE_PIECES).map((p, i) => ({
    n: i + 1, name: clipText(p.name, SHARE_LIMITS.pieceName), category: p.category,
    brand: showBrands && p.brand?.trim() ? clipText(p.brand.trim(), SHARE_LIMITS.brand) : null,
  }));
}

export function pieceLabel(p: { name: string; brand: string | null }): string {
  return p.brand ? `${p.name} — ${p.brand}` : p.name;
}

/** Fixed month names: Intl disagrees between Node ("Sept") and Safari ("Sep"). */
export function shareKicker(occasion: string, isoDate: string | null): string {
  const parts: string[] = [];
  if (occasion) parts.push(occasion.charAt(0).toUpperCase() + occasion.slice(1));
  const m = isoDate?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) parts.push(`${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}`);
  return parts.join(" · ");
}

export function shareExpiry(readyAt: string): Date {
  return new Date(Date.parse(readyAt) + SHARE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function isShareToken(v: unknown): v is string {
  return typeof v === "string" && TOKEN.test(v);
}

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}
