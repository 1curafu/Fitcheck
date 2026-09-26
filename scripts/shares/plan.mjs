const DAY = 24 * 60 * 60 * 1000;
const TOKEN = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Select expired published shares, abandoned drafts, and old folders with no row.
 * @param {{ rows: { token: string, ready_at: string | null, created_at: string }[], folders: { name: string, modTime: string }[], now: Date }} input
 */
export function planExpiry({ rows, folders, now }) {
  const t = now.getTime();
  const expire = rows
    .filter((r) => (r.ready_at ? Date.parse(r.ready_at) <= t - 30 * DAY : Date.parse(r.created_at) <= t - DAY))
    .map((r) => r.token);
  const known = new Set(rows.map((r) => r.token));
  const orphans = folders
    .map((f) => { if (!TOKEN.test(f.name)) throw new Error("Unexpected folder"); return f; })
    .filter((f) => !known.has(f.name) && Date.parse(f.modTime) <= t - DAY)
    .map((f) => f.name);
  return { expire, orphans };
}
