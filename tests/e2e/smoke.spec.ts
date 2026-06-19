import { expect, test } from "@playwright/test";

test("home page loads with hero heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Plan Your Dream Journey With AI/i })).toBeVisible();
});

test("planner page loads command center", async ({ page }) => {
  await page.goto("/planner");
  await expect(page.getByRole("heading", { name: /AI Travel Command Center/i })).toBeVisible();
});
