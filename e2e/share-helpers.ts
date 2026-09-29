import type { Page } from "@playwright/test";
import { admin, testUserId } from "./helpers";

export async function noNativeShare(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
  });
}


export async function seededLookId() {
  const { data } = await admin().from("outfits").select("id").eq("user_id", await testUserId()).eq("look_name", "E2E Seeded Look").single();
  return data!.id as string;
}

export async function cleanupShares() {
  const db = admin();
  const { data } = await db.from("look_shares").select("token").eq("user_id", await testUserId());
  for (const s of data ?? []) await db.storage.from("shares").remove(["story.jpg", "post.jpg", "og.jpg"].map((f) => `${s.token}/${f}`));
  await db.from("look_shares").delete().eq("user_id", await testUserId());
}

export async function createLink(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Share" }).click();
  const sheet = page.getByRole("dialog", { name: /share this look/i });
  await sheet.getByRole("button", { name: /create link/i }).click();
  return (await sheet.getByTestId("share-url").textContent({ timeout: 30_000 }))!.trim();
}
