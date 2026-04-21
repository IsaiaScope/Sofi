import { expect, test } from "../fixtures";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("register page", () => {
  test("renders the register form", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
  });

  test("happy path redirects to /check-email with the typed email", async ({
    page,
    deleteUser,
  }) => {
    const email = `register-new-${Date.now()}@test.sofi.local`;
    const password = "Correct-Horse-Battery-9";

    try {
      await page.goto("/register");
      await page.getByLabel(/display name/i).fill("New Op");
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/^password$/i).fill(password);
      await page.getByLabel(/confirm password/i).fill(password);
      await page
        .getByRole("button", { name: /create operator|initialize session|create account/i })
        .click();

      await page.waitForURL(/\/check-email/, { timeout: 10_000 });
      await expect(page.getByText(/inbox incoming/i)).toBeVisible();
      await expect(page.getByText(email)).toBeVisible();
    } finally {
      try {
        deleteUser(email);
      } catch {
        // registration may have failed before creating a row
      }
    }
  });

  test("mismatched passwords surface a form error", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel(/email/i).fill(`mismatch-${Date.now()}@test.sofi.local`);
    await page.getByLabel(/^password$/i).fill("Correct-Horse-Battery-9");
    await page.getByLabel(/confirm password/i).fill("Different-Password-9");
    await page
      .getByRole("button", { name: /create operator|initialize session|create account/i })
      .click();

    // react-hook-form + zod surfaces this message next to the field.
    await expect(page.getByText(/passwords do not match/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  test("'Sign In' link navigates back to /login", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("button", { name: /authorize|sign in/i }).click();
    await page.waitForURL(/\/login/);
  });
});
