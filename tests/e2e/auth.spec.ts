import { expect, test } from "@playwright/test";

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("shows login page by default", async ({ page }) => {
    await expect(page.locator("text=Welcome back")).toBeVisible();
    await expect(page.locator("text=Sign In")).toBeVisible();
  });

  test("can navigate to register page", async ({ page }) => {
    await page.click("text=Create account");
    await expect(page.locator("text=Create Account")).toBeVisible();
  });

  test("shows validation error for short username", async ({ page }) => {
    await page.fill('input[placeholder="operator"]', "ab");
    await page.fill('input[placeholder="••••••••"]', "password123");
    await page.click("text=Sign In");
    // Should show error from backend validation
    await expect(page.locator("text=Invalid username or password")).toBeVisible({
      timeout: 5000,
    });
  });

  test("register and login flow", async ({ page }) => {
    // Navigate to register
    await page.click("text=Create account");

    // Fill registration form
    await page.fill('input[placeholder="Your name"]', "Test User");
    await page.fill('input[placeholder="operator"]', `testuser_${Date.now()}`);
    await page.fill('input[placeholder="you@example.com"]', `test${Date.now()}@sofi.dev`);
    await page.fill('input[placeholder="••••••••"]', "password123");
    await page.click("text=Sign Up");

    // With mandatory email verification, the user is sent to the Check-Email
    // page instead of the main app.
    await expect(page.locator("text=Check your inbox")).toBeVisible({ timeout: 10000 });
  });
});
