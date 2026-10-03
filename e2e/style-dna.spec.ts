import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/.auth/state.json" });

test("Profile opens Style DNA; the seeded seven-piece closet reads the quiz answer", async ({ page }) => {
  await page.goto("/profile");
  await page.getByRole("link", { name: /style dna/i }).first().click();
  await expect(page).toHaveURL(/\/style-dna$/);
  await expect(page.getByRole("heading", { name: "Old Money" })).toBeVisible();
  await expect(page.getByText(/add a few more pieces/i)).toBeVisible();
  await expect(page.getByText(/looks worn/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Share" })).toBeEnabled({ timeout: 15_000 });
});
