const ORIGINAL_FILE = /^original\.[a-z0-9]+$/i;

/**
 * Where a piece's ORIGINAL photo lives, if `imageUrl` is a well-formed path owned by `userId`.
 *
 * ⚠️ The folder is read from the path, never assumed to be the row id: rows saved before batch capture (#112) got
 * their folder id from `uploadAndTag` and a different row id from the database, and the e2e seed uses `e2e-<n>`.
 */
export function originalLocation(userId: string, imageUrl: string): { folder: string; file: string } | null {
  const parts = imageUrl.split("/");
  if (parts.length !== 3) return null;
  const [owner, folder, file] = parts;
  if (owner !== userId || !folder || folder === "." || folder === ".." || !ORIGINAL_FILE.test(file)) return null;
  return { folder: `${owner}/${folder}`, file };
}
