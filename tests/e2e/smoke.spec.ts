import { expect, test } from "@playwright/test";

test("home page loads with hero heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Explore smarter with AI\./i })).toBeVisible();
});

test("planner page loads command center", async ({ page }) => {
  await page.goto("/planner");
  await expect(page.getByRole("heading", { name: /How can I help you plan your trip\?/i })).toBeVisible();
});
