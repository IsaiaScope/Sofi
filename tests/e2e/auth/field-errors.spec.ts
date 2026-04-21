import { test, expect, uniqueEmail } from "../fixtures";
import { bootApp, navigateTo } from "../router-helpers";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("server field errors render inline", () => {
  test("register: duplicate email surfaces under the email field", async ({
    page,
    seedUser,
  }) => {
    const existing = seedUser("dup-email");
    await bootApp(page);
    await navigateTo(page, "/register");
    await page.getByLabel(/display name/i).fill("Dup");
    await page.getByRole("textbox", { name: /email/i }).fill(existing.email);
    await page.locator('input[type="password"]').first().fill("Correct-Horse-Battery-9");
    await page.locator('input[type="password"]').nth(1).fill("Correct-Horse-Battery-9");
    await page
      .getByRole("button", { name: /create operator|initialize session|create account/i })
      .click();
    const emailField = page.getByRole("textbox", { name: /email/i });
    await expect(emailField).toHaveAttribute("aria-invalid", "true", { timeout: 5_000 });
  });

  test("login: empty password surfaces under password (or banner)", async ({ page }) => {
    await bootApp(page);
    await navigateTo(page, "/login");
    await page.getByRole("textbox", { name: /email/i }).fill(uniqueEmail("empty-pw"));
    // Leave password empty — Zod validates min(1) client-side without a server round-trip.
    await page.getByRole("button", { name: /sign in/i }).click();
    const pwField = page.locator('input[type="password"]').first();
    await expect(pwField).toHaveAttribute("aria-invalid", "true", { timeout: 5_000 });
  });
});
