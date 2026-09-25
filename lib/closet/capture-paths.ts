/** Only the files created by the two-stage capture flow may be confirmed or discarded. */
const ITEM_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DRAFT_FILE = /^(?:original\.jpg|cutout\.(?:webp|png)|thumb\.(?:webp|png))$/;

export type DraftIdentity = {
  itemId: string;
  imagePath: string;
  cutoutPath: string;
  thumbPath?: string | null;
};

export function assertDraftIdentity(userId: string, input: DraftIdentity): string {
  const base = `${userId}/${input.itemId}`;
  if (!ITEM_ID.test(input.itemId) ||
      input.imagePath !== `${base}/original.jpg` ||
      ![`${base}/cutout.webp`, `${base}/cutout.png`].includes(input.cutoutPath) ||
      (input.thumbPath != null &&
       ![`${base}/thumb.webp`, `${base}/thumb.png`].includes(input.thumbPath))) {
    throw new Error("Not your upload");
  }
  return base;
}

/** Ignore malformed paths, then group exact owned draft files by item id. */
export function groupOwnedDraftPaths(userId: string, paths: (string | null)[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const path of paths) {
    if (!path) continue;
    const parts = path.split("/");
    if (parts.length !== 3 || parts[0] !== userId ||
        !ITEM_ID.test(parts[1]) || !DRAFT_FILE.test(parts[2])) continue;
    const found = groups.get(parts[1]) ?? [];
    found.push(path);
    groups.set(parts[1], found);
  }
  return groups;
}
