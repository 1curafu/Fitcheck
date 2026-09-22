#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { deletionDigest, listB2TombstoneDigests } from "../../lib/account-deletion/ledger.mjs";
import { listWardrobeOwnerIds, purgeWardrobePrefix } from "../../lib/account-deletion/storage.mjs";
import { pathToFileURL } from "node:url";

const PAGE_SIZE = 1000;
const CONFIGURATION_ERROR = "Deletion reconciliation configuration is invalid";

/** @param {unknown} value @param {string} name */
function required(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function configurationError() {
  throw new Error(CONFIGURATION_ERROR);
}

/**
 * Parses the current writer/restore key plus restore-only retained keys. The
 * web writer never reads the optional previous-key configuration.
 *
 * @param {unknown} currentKey
 * @param {unknown} previousKeysJson
 * @returns {string[]}
 */
export function parseRetainedHmacKeys(currentKey, previousKeysJson) {
  if (typeof currentKey !== "string" || currentKey.trim().length === 0) {
    configurationError();
  }
  if (previousKeysJson === undefined) return [currentKey];
  if (typeof previousKeysJson !== "string") configurationError();

  let previousKeys;
  try {
    previousKeys = JSON.parse(previousKeysJson);
  } catch {
    configurationError();
  }
  if (!Array.isArray(previousKeys) || previousKeys.some((key) => typeof key !== "string" || key.trim().length === 0)) {
    configurationError();
  }
  return [...new Set([currentKey, ...previousKeys])];
}

/** @param {unknown} config */
export function validateReconciliationConfig(config) {
  for (const key of ["supabaseUrl", "serviceRoleKey", "readerKeyId", "readerApplicationKey"]) {
    if (typeof config?.[key] !== "string" || config[key].trim().length === 0) {
      configurationError();
    }
  }
  return parseRetainedHmacKeys(config.hmacKey, config.previousHmacKeysJson);
}

/** @param {{ supabaseUrl: string, serviceRoleKey: string }} config */
function createRestoreAdminClient(config) {
  try {
    return createClient(required(config.supabaseUrl, "Restore Supabase URL"), required(config.serviceRoleKey, "Restore service role key"), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  } catch {
    throw new Error("Deletion reconciliation failed");
  }
}

/** @param {ReturnType<typeof createRestoreAdminClient>} client */
async function listRestoreUsers(client, page) {
  try {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error || !Array.isArray(data?.users)) throw new Error();
    const users = data.users.map((user) => user?.id);
    if (users.some((userId) => typeof userId !== "string" || userId.length === 0)) {
      throw new Error();
    }
    return users;
  } catch {
    throw new Error("Deletion reconciliation failed");
  }
}

/** @param {ReturnType<typeof createRestoreAdminClient>} client @param {string} userId */
async function hardDeleteRestoreUser(client, userId) {
  try {
    const { error } = await client.auth.admin.deleteUser(userId, false);
    if (error) throw new Error();
  } catch {
    throw new Error("Deletion reconciliation failed");
  }
}

/**
 * Removes accounts deleted after a snapshot was taken, then every wardrobe
 * folder that no remaining restored Auth user owns (an upload that raced a live
 * deletion, or a sign-up between the database dump and the Storage copy). Every
 * tombstone lookup, listing, Storage purge, and Auth delete must succeed;
 * restoring traffic is unsafe otherwise.
 *
 * @param {{ supabaseUrl: string, serviceRoleKey: string, readerKeyId: string, readerApplicationKey: string, hmacKey: string, previousHmacKeysJson?: string }} config
 * @param {{ listDigests?: () => Promise<Set<string>>, listUsers?: (page: number) => Promise<string[]>, listOwners?: () => Promise<string[]>, purgeStorage?: (userId: string) => Promise<void>, deleteUser?: (userId: string) => Promise<void>, write?: (line: string) => unknown }} [dependencies]
 * @returns {Promise<{ scanned: number, deleted: number, orphanPrefixes: number }>}
 */
export async function reconcileDeletedAccounts(config, dependencies = {}) {
  let listDigests = dependencies.listDigests;
  let listUsers = dependencies.listUsers;
  let listOwners = dependencies.listOwners;
  let purgeStorage = dependencies.purgeStorage;
  let deleteUser = dependencies.deleteUser;
  const write = dependencies.write ?? ((line) => process.stdout.write(line));

  let hmacKeys;
  try {
    hmacKeys = validateReconciliationConfig(config);
  } catch {
    throw new Error(CONFIGURATION_ERROR);
  }

  try {
    const client = !listUsers || !listOwners || !purgeStorage || !deleteUser ? createRestoreAdminClient(config) : null;
    listDigests ??= () => listB2TombstoneDigests({
      keyId: config.readerKeyId,
      applicationKey: config.readerApplicationKey,
    });
    listUsers ??= (page) => listRestoreUsers(client, page);
    listOwners ??= () => listWardrobeOwnerIds(client);
    purgeStorage ??= (userId) => purgeWardrobePrefix(client, userId);
    deleteUser ??= (userId) => hardDeleteRestoreUser(client, userId);

    const digests = await listDigests();
    if (!(digests instanceof Set)) throw new Error();

    const restoredUserIds = [];
    for (let page = 1; ; page += 1) {
      const users = await listUsers(page);
      if (!Array.isArray(users) || users.some((userId) => typeof userId !== "string" || userId.length === 0)) {
        throw new Error();
      }

      restoredUserIds.push(...users);
      if (users.length < PAGE_SIZE) break;
    }

    const remainingUserIds = new Set(restoredUserIds);
    let deleted = 0;
    for (const userId of restoredUserIds) {
      if (!hmacKeys.some((hmacKey) => digests.has(deletionDigest(userId, hmacKey)))) continue;
      await purgeStorage(userId);
      await deleteUser(userId);
      remainingUserIds.delete(userId);
      deleted += 1;
    }

    const owners = await listOwners();
    if (!Array.isArray(owners) || owners.some((ownerId) => typeof ownerId !== "string" || ownerId.length === 0)) {
      throw new Error();
    }
    let orphanPrefixes = 0;
    for (const ownerId of owners) {
      if (remainingUserIds.has(ownerId)) continue;
      await purgeStorage(ownerId);
      orphanPrefixes += 1;
    }

    const result = { scanned: restoredUserIds.length, deleted, orphanPrefixes };
    write(
      `Deletion reconciliation complete: scanned=${result.scanned} deleted=${result.deleted} orphanPrefixes=${result.orphanPrefixes}\n`,
    );
    return result;
  } catch {
    throw new Error("Deletion reconciliation failed");
  }
}

function configFromEnvironment() {
  return {
    supabaseUrl: process.env.RESTORE_SUPABASE_URL,
    serviceRoleKey: process.env.RESTORE_SERVICE_ROLE_KEY,
    readerKeyId: process.env.B2_DELETION_READER_KEY_ID,
    readerApplicationKey: process.env.B2_DELETION_READER_APPLICATION_KEY,
    hmacKey: process.env.DELETION_LEDGER_HMAC_KEY,
    previousHmacKeysJson: process.env.DELETION_LEDGER_PREVIOUS_HMAC_KEYS_JSON,
  };
}

async function main() {
  const config = configFromEnvironment();
  if (process.argv[2] === "validate-config" && process.argv.length === 3) {
    validateReconciliationConfig(config);
    return;
  }
  if (process.argv.length === 2) {
    await reconcileDeletedAccounts(config);
    return;
  }
  configurationError();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(
      error instanceof Error && error.message === CONFIGURATION_ERROR
        ? `${CONFIGURATION_ERROR}\n`
        : "Deletion reconciliation failed\n",
    );
    process.exitCode = 1;
  });
}
