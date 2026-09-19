import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { admin, disposableSessionCookies } from "./helpers";

const BUCKET = "wardrobe";
const PASSWORD = "disposable-account-deletion-password";
const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

type DisposableAccount = {
  email: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  paths: string[];
  outfitId: string;
  tripId: string;
};

function requireEnvironment(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for the account-deletion journey`);
  return value;
}

async function requireNoError(operation: PromiseLike<{ error: { message: string } | null }>, description: string): Promise<void> {
  const { error } = await operation;
  if (error) throw new Error(`${description}: ${error.message}`);
}

async function createDisposableAccount(): Promise<DisposableAccount> {
  const db = admin();
  const suffix = randomUUID();
  const email = `account-delete-${suffix}@fitcheck.test`;
  const created = await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (created.error || !created.data.user) throw new Error(`creating disposable user failed: ${created.error?.message ?? "no user"}`);

  const userId = created.data.user.id;
  const paths = [
    `${userId}/representative/original.jpg`,
    `${userId}/representative/cutout.webp`,
    `${userId}/abandoned/cutout.webp`,
    `${userId}/concurrent/cutout.webp`,
    `${userId}/stale/cutout.webp`,
  ];

  const url = requireEnvironment("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnvironment("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const browserClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signedIn = await browserClient.auth.signInWithPassword({ email, password: PASSWORD });
  if (signedIn.error || !signedIn.data.session) {
    throw new Error(`signing in disposable user failed: ${signedIn.error?.message ?? "no session"}`);
  }

  const { access_token: accessToken, refresh_token: refreshToken } = signedIn.data.session;
  try {
    await requireNoError(
      db.from("profiles").update({ display_name: "Disposable deletion journey" }).eq("id", userId),
      "seeding disposable profile",
    );
    await requireNoError(
      db.storage.from(BUCKET).upload(paths[0], ONE_PIXEL_PNG, { contentType: "image/png" }),
      "uploading representative original",
    );
    await requireNoError(
      db.storage.from(BUCKET).upload(paths[1], ONE_PIXEL_PNG, { contentType: "image/png" }),
      "uploading representative cutout",
    );
    await requireNoError(
      db.storage.from(BUCKET).upload(paths[2], ONE_PIXEL_PNG, { contentType: "image/png" }),
      "uploading abandoned orphan",
    );

    const item = await db
      .from("items")
      .insert({
        user_id: userId,
        name: "Disposable deletion shirt",
        image_url: paths[0],
        cutout_url: paths[1],
        category: "Tops",
        colors: ["white"],
        pattern: "solid",
        formality: 3,
        seasons: ["Spring"],
        archived: false,
      })
      .select("id")
      .single();
    if (item.error || !item.data) throw new Error(`seeding disposable item: ${item.error?.message ?? "no item"}`);

    const outfit = await db
      .from("outfits")
      .insert({ user_id: userId, look_name: "Disposable deletion look", occasion: "work" })
      .select("id")
      .single();
    if (outfit.error || !outfit.data) throw new Error(`seeding disposable outfit: ${outfit.error?.message ?? "no outfit"}`);

    const itemId = item.data.id as string;
    const outfitId = outfit.data.id as string;
    await requireNoError(
      db.from("outfit_items").insert({ outfit_id: outfitId, item_id: itemId, slot: "Tops" }),
      "seeding disposable outfit item",
    );
    await requireNoError(
      db.from("wear_logs").insert({ user_id: userId, outfit_id: outfitId, worn_on: "2026-09-19", occasion: "work" }),
      "seeding disposable wear log",
    );
    await requireNoError(
      db.from("generation_events").insert({ user_id: userId, occasion: "work", generated_on: "2026-09-19", kind: "drop" }),
      "seeding disposable generation event",
    );
    await requireNoError(
      db.from("occasion_overrides").insert({ user_id: userId, generated_on: "2026-09-19", predicted: "work", chosen: "everyday" }),
      "seeding disposable occasion override",
    );

    const trip = await db
      .from("trips")
      .insert({
        user_id: userId,
        destination_label: "Zurich",
        lat: 47.3769,
        lon: 8.5417,
        timezone: "Europe/Zurich",
        start_date: "2026-10-01",
        end_date: "2026-10-02",
      })
      .select("id")
      .single();
    if (trip.error || !trip.data) throw new Error(`seeding disposable trip: ${trip.error?.message ?? "no trip"}`);
    const tripId = trip.data.id as string;
    await requireNoError(db.from("trip_items").insert({ trip_id: tripId, item_id: itemId }), "seeding disposable trip item");

    return { email, userId, accessToken, refreshToken, paths, outfitId, tripId };
  } catch (error) {
    await cleanUpDisposableAccount({ email, userId, accessToken, refreshToken, paths, outfitId: "", tripId: "" });
    throw error;
  }
}

async function cleanUpDisposableAccount(account: DisposableAccount): Promise<void> {
  const db = admin();
  await db.storage.from(BUCKET).remove(account.paths);
  await db.auth.admin.deleteUser(account.userId, false);
}

async function expectDeletedDatabaseRows(account: DisposableAccount): Promise<void> {
  const db = admin();
  const checks = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }).eq("id", account.userId),
    db.from("items").select("id", { count: "exact", head: true }).eq("user_id", account.userId),
    db.from("outfits").select("id", { count: "exact", head: true }).eq("user_id", account.userId),
    db.from("wear_logs").select("id", { count: "exact", head: true }).eq("user_id", account.userId),
    db.from("generation_events").select("id", { count: "exact", head: true }).eq("user_id", account.userId),
    db.from("occasion_overrides").select("id", { count: "exact", head: true }).eq("user_id", account.userId),
    db.from("trips").select("id", { count: "exact", head: true }).eq("user_id", account.userId),
    db.from("outfit_items").select("outfit_id", { count: "exact", head: true }).eq("outfit_id", account.outfitId),
    db.from("trip_items").select("trip_id", { count: "exact", head: true }).eq("trip_id", account.tripId),
  ]);
  for (const check of checks) {
    expect(check.error?.message).toBeUndefined();
    expect(check.count).toBe(0);
  }
}

async function expectStoragePrefixEmpty(userId: string): Promise<void> {
  const { data, error } = await admin().storage.from(BUCKET).list(userId, { limit: 100 });
  expect(error?.message).toBeUndefined();
  expect(data).toEqual([]);
}

test("a disposable user can delete their account without leaving rows, objects, or stale-token access", async ({ browser }) => {
  const account = await createDisposableAccount();
  let deleted = false;
  const url = requireEnvironment("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnvironment("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  try {
    const context = await browser.newContext();
    await context.addCookies(await disposableSessionCookies(account.email, PASSWORD));
    const page = await context.newPage();
    await page.goto("/settings");

    await page.getByRole("button", { name: "Delete account" }).click();
    const confirmation = page.getByLabel("Type your email exactly to continue");
    const submit = page.getByRole("dialog", { name: "Delete account" }).getByRole("button", { name: "Delete account" });
    await confirmation.fill("wrong@fitcheck.test");
    await expect(submit).toBeDisabled();

    await confirmation.fill(account.email);
    await expect(submit).toBeEnabled();

    const concurrentClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await concurrentClient.auth.setSession({ access_token: account.accessToken, refresh_token: account.refreshToken });
    const concurrentUpload = concurrentClient.storage
      .from(BUCKET)
      .upload(account.paths[3], ONE_PIXEL_PNG, { contentType: "image/png" });

    await submit.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("status")).toHaveText("Your account and live data have been deleted.");
    await concurrentUpload;
    await context.close();
    deleted = true;

    await expectDeletedDatabaseRows(account);
    await expectStoragePrefixEmpty(account.userId);

    const read = await fetch(`${url}/storage/v1/object/${BUCKET}/${account.paths[1]}`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${account.accessToken}` },
    });
    expect(read.ok).toBe(false);

    const staleWrite = await fetch(`${url}/storage/v1/object/${BUCKET}/${account.paths[4]}`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "image/png",
        "x-upsert": "false",
      },
      body: ONE_PIXEL_PNG,
    });
    expect(staleWrite.ok).toBe(false);
    await expectStoragePrefixEmpty(account.userId);
  } finally {
    if (!deleted) await cleanUpDisposableAccount(account);
  }
});
