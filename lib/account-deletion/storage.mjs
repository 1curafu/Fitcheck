const BUCKET = "wardrobe";
const PAGE_SIZE = 1000;
const REMOVE_BATCH_SIZE = 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** @param {unknown} userId */
function assertDeletionUserId(userId) {
  if (typeof userId !== "string" || !UUID.test(userId)) {
    throw new Error("Invalid deletion user ID");
  }
}

/**
 * Lists one Storage prefix in stable pages. Storage represents folders with a
 * null `id`; concrete files have a non-null `id`.
 *
 * @param {{ list: (prefix: string, options: { limit: number, offset: number, sortBy: { column: string, order: string } }) => Promise<{ data: Array<{ name: string, id: string | null }> | null, error: unknown }> }} bucket
 * @param {string} prefix
 * @returns {Promise<Array<{ name: string, id: string | null }>>}
 */
async function listPrefix(bucket, prefix) {
  const entries = [];
  let offset = 0;

  do {
    let response;
    try {
      response = await bucket.list(prefix, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
    } catch {
      throw new Error("Wardrobe listing failed");
    }

    if (response?.error || !Array.isArray(response?.data)) {
      throw new Error("Wardrobe listing failed");
    }

    entries.push(...response.data);
    offset += response.data.length;
    if (response.data.length < PAGE_SIZE) break;
  } while (true);

  return entries;
}

/**
 * Collects every concrete object under an account prefix before any mutation.
 * This includes abandoned capture files that have no database row.
 *
 * @param {{ storage: { from: (bucket: string) => { list: Function } } }} client
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function collectWardrobePaths(client, userId) {
  assertDeletionUserId(userId);
  const bucket = client.storage.from(BUCKET);
  const paths = [];
  const prefixes = [userId];

  while (prefixes.length > 0) {
    const prefix = prefixes.shift();
    const entries = await listPrefix(bucket, prefix);

    for (const entry of entries) {
      if (!entry || typeof entry.name !== "string" || entry.name.length === 0 || typeof entry.id !== "string" && entry.id !== null) {
        throw new Error("Wardrobe listing failed");
      }

      const path = `${prefix}/${entry.name}`;
      if (entry.id === null) {
        prefixes.push(path);
      } else {
        paths.push(path);
      }
    }
  }

  return paths.sort((left, right) => left.localeCompare(right));
}

/**
 * Deletes every account-owned wardrobe object and proves Storage is empty.
 *
 * @param {{ storage: { from: (bucket: string) => { list: Function, remove: (paths: string[]) => Promise<{ error: unknown }> } } }} client
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function purgeWardrobePrefix(client, userId) {
  assertDeletionUserId(userId);
  const bucket = client.storage.from(BUCKET);
  const paths = await collectWardrobePaths(client, userId);

  for (let start = 0; start < paths.length; start += REMOVE_BATCH_SIZE) {
    try {
      const { error } = await bucket.remove(paths.slice(start, start + REMOVE_BATCH_SIZE));
      if (error) throw new Error();
    } catch {
      throw new Error("Wardrobe removal failed");
    }
  }

  if ((await collectWardrobePaths(client, userId)).length > 0) {
    throw new Error("Wardrobe verification failed");
  }
}
