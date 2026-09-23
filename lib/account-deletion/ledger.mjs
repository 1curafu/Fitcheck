import { createHash, createHmac } from "node:crypto";

export const DELETION_LEDGER_PREFIX = "deletion-ledger/";
export const DELETION_LEDGER_VERSION = "v1";

function required(value, name) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
}

const B2_BUCKET_NAME = "fitcheck-prod-backups-eu-a7k29m";

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return typeof value === "object" && value !== null;
}

/** @param {unknown} value @returns {string | null} */
function stringValue(value) {
  return typeof value === "string" ? value : null;
}

/**
 * Converts every provider/network/parser failure into a stable internal error.
 * @param {string} url
 * @param {RequestInit} init
 * @param {string} failure
 * @returns {Promise<Record<string, unknown>>}
 */
async function b2Json(url, init, failure) {
  try {
    const response = await fetch(url, init);
    if (!response.ok) throw new Error(failure);
    const body = await response.json();
    if (!isRecord(body)) throw new Error(failure);
    return body;
  } catch {
    throw new Error(failure);
  }
}

/**
 * @typedef {{ id: string; name: string }} B2Bucket
 * @typedef {{ apiUrl: string; authorizationToken: string; bucket: B2Bucket }} B2Authorization
 * @typedef {{ keyId: string; applicationKey: string }} B2Credentials
 */

/**
 * Authorizes one narrow B2 application key and checks that it has no broader
 * access than the operation about to follow.
 * @param {B2Credentials} config
 * @param {"writeFiles" | "listFiles"} capability
 * @returns {Promise<B2Authorization>}
 */
async function authorize(config, capability) {
  const keyId = required(config?.keyId, "B2 deletion key ID");
  const applicationKey = required(config?.applicationKey, "B2 deletion application key");
  const authorization = `Basic ${Buffer.from(`${keyId}:${applicationKey}`).toString("base64")}`;
  const body = await b2Json(
    "https://api.backblazeb2.com/b2api/v4/b2_authorize_account",
    { method: "GET", headers: { Authorization: authorization } },
    "B2 authorization failed",
  );

  const storageApi = isRecord(body.apiInfo) && isRecord(body.apiInfo.storageApi) ? body.apiInfo.storageApi : null;
  const allowed = storageApi && isRecord(storageApi.allowed) ? storageApi.allowed : null;
  const buckets = allowed?.buckets;
  const capabilities = allowed?.capabilities;
  if (!storageApi || !allowed) throw new Error("B2 authorization failed");
  // A key that works but is not scoped exactly to this bucket, prefix and capability. Named separately so an
  // operator can tell a wrong key from an over- or under-privileged one.
  if (
    !Array.isArray(buckets) ||
    buckets.length !== 1 ||
    !isRecord(buckets[0]) ||
    stringValue(buckets[0].name) !== B2_BUCKET_NAME ||
    stringValue(buckets[0].id) === null ||
    !Array.isArray(capabilities) ||
    capabilities.length !== 1 ||
    capabilities[0] !== capability ||
    allowed.namePrefix !== DELETION_LEDGER_PREFIX
  ) {
    throw new Error("B2 key scope rejected");
  }

  const apiUrl = stringValue(storageApi.apiUrl);
  const authorizationToken = stringValue(body.authorizationToken);
  if (!apiUrl || !authorizationToken) throw new Error("B2 authorization failed");
  return { apiUrl, authorizationToken, bucket: { id: buckets[0].id, name: buckets[0].name } };
}

/**
 * @param {string} userId
 * @param {string} hmacKey
 * @returns {string}
 */
export function deletionDigest(userId, hmacKey) {
  return createHmac("sha256", required(hmacKey, "Deletion ledger HMAC key"))
    .update(required(userId, "Deletion ledger user ID"), "utf8")
    .digest("hex");
}

/**
 * @param {string} userId
 * @param {Date} requestedAt
 * @param {string} hmacKey
 * @returns {string}
 */
export function deletionTombstoneName(userId, requestedAt, hmacKey) {
  const requestedOn = requestedAt.toISOString().slice(0, 10);
  return `${DELETION_LEDGER_PREFIX}${DELETION_LEDGER_VERSION}/${requestedOn}/${deletionDigest(userId, hmacKey)}.json`;
}

/**
 * @typedef {B2Credentials & { userId: string; requestedAt: Date; hmacKey: string }} B2TombstoneConfig
 */

/**
 * Writes the minimum durable evidence needed to prevent restoring a deleted
 * account from a later backup. The object name and contents never contain PII.
 * @param {B2TombstoneConfig} config
 * @returns {Promise<{ fileName: string }>}
 */
export async function writeB2Tombstone(config) {
  const auth = await authorize(config, "writeFiles");
  const fileName = deletionTombstoneName(config.userId, config.requestedAt, config.hmacKey);
  const body = JSON.stringify({ version: 1, requestedAt: config.requestedAt.toISOString() });
  const sha1 = createHash("sha1").update(body, "utf8").digest("hex");

  const uploadDetails = await b2Json(
    `${auth.apiUrl}/b2api/v4/b2_get_upload_url?bucketId=${encodeURIComponent(auth.bucket.id)}`,
    { method: "GET", headers: { Authorization: auth.authorizationToken } },
    "B2 upload URL failed",
  );
  const uploadUrl = stringValue(uploadDetails.uploadUrl);
  const uploadToken = stringValue(uploadDetails.authorizationToken);
  if (uploadDetails.bucketId !== auth.bucket.id || !uploadUrl || !uploadToken) {
    throw new Error("B2 upload URL failed");
  }

  const result = await b2Json(
    uploadUrl,
    {
      method: "POST",
      headers: {
        Authorization: uploadToken,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": String(Buffer.byteLength(body)),
        "X-Bz-File-Name": encodeURIComponent(fileName),
        "X-Bz-Content-Sha1": sha1,
      },
      body,
    },
    "B2 upload failed",
  );
  if (result.fileName !== fileName || result.bucketId !== auth.bucket.id || result.contentSha1 !== sha1) {
    throw new Error("B2 upload failed");
  }
  return { fileName };
}

/**
 * Lists deletion ledger HMAC digests without downloading tombstones. This is
 * deliberately narrow so restore reconciliation cannot enumerate backups.
 * @param {B2Credentials} config
 * @returns {Promise<Set<string>>}
 */
export async function listB2TombstoneDigests(config) {
  const auth = await authorize(config, "listFiles");
  const digests = new Set();
  const pattern = new RegExp(
    `^${DELETION_LEDGER_PREFIX}${DELETION_LEDGER_VERSION}/\\d{4}-\\d{2}-\\d{2}/([a-f0-9]{64})\\.json$`,
  );
  /** @type {string | null} */
  let nextFileName = null;

  do {
    const params = new URLSearchParams({
      bucketId: auth.bucket.id,
      prefix: DELETION_LEDGER_PREFIX,
      maxFileCount: "10000",
    });
    if (nextFileName) params.set("startFileName", nextFileName);
    const result = await b2Json(
      `${auth.apiUrl}/b2api/v4/b2_list_file_names?${params.toString()}`,
      { method: "GET", headers: { Authorization: auth.authorizationToken } },
      "B2 list failed",
    );
    if (!Array.isArray(result.files) || (result.nextFileName !== null && typeof result.nextFileName !== "string")) {
      throw new Error("B2 list failed");
    }
    for (const file of result.files) {
      if (!isRecord(file)) continue;
      const fileName = stringValue(file.fileName);
      const match = fileName?.match(pattern);
      if (match) digests.add(match[1]);
    }
    nextFileName = result.nextFileName;
  } while (nextFileName);

  return digests;
}
