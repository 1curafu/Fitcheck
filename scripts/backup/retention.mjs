#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const DAY_MS = 24 * 60 * 60 * 1000;
const DAILY_WINDOW_MS = 14 * DAY_MS;
const MAX_AGE_MS = 30 * DAY_MS;

function isoWeekKey(date) {
  const thursday = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ));
  const day = thursday.getUTCDay() || 7;
  thursday.setUTCDate(thursday.getUTCDate() + 4 - day);

  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((thursday.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function parseSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    throw new Error("snapshot must be an object");
  }

  const id = snapshot.short_id ?? snapshot.id;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("snapshot id must be a non-empty string");
  }

  if (typeof snapshot.time !== "string") {
    throw new Error(`snapshot ${id} has no timestamp`);
  }

  const time = new Date(snapshot.time);
  if (!Number.isFinite(time.getTime())) {
    throw new Error(`snapshot ${id} has an invalid timestamp`);
  }

  return { id, time };
}

export function selectSnapshotsToForget(snapshots, now = new Date()) {
  if (!Array.isArray(snapshots)) {
    throw new Error("snapshots must be an array");
  }
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new Error("current time must be a valid Date");
  }

  const parsed = snapshots.map(parseSnapshot);
  const weeklyNewest = new Map();
  const expired = new Set();

  for (const entry of parsed) {
    const age = now.getTime() - entry.time.getTime();
    if (age < 0) {
      throw new Error(`snapshot ${entry.id} is in the future`);
    }
    if (age > MAX_AGE_MS) {
      expired.add(entry.id);
      continue;
    }
    if (age < DAILY_WINDOW_MS) continue;

    const week = isoWeekKey(entry.time);
    const newest = weeklyNewest.get(week);
    if (!newest || entry.time > newest.time) weeklyNewest.set(week, entry);
  }

  return parsed
    .filter((entry) => {
      if (expired.has(entry.id)) return true;

      const age = now.getTime() - entry.time.getTime();
      if (age < DAILY_WINDOW_MS) return false;

      return weeklyNewest.get(isoWeekKey(entry.time))?.id !== entry.id;
    })
    .map((entry) => entry.id);
}

async function readStdin() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  return input;
}

async function main() {
  const input = await readStdin();
  const snapshots = JSON.parse(input);
  const ids = selectSnapshotsToForget(snapshots);
  if (ids.length > 0) process.stdout.write(`${ids.join("\n")}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
