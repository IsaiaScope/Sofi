import { expect, test, uniqueEmail } from "../fixtures";
import { bootApp, navigateTo, waitForRoute } from "../router-helpers";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("register page", () => {
  test("renders the register form", async ({ page }) => {
    await bootApp(page);
    await navigateTo(page, "/register");
    // Use role-based locators to avoid strict mode collision with router devtools
    // buttons that also match /email/i in their aria-labels.
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
    // Password fields: the label "PASSWORD" is visually uppercase via CSS but DOM
    // text is "Password". Target by type + ordinal since getByLabel may not link
    // correctly when the PasswordInput toggle button is inside the same wrapper.
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').nth(1)).toBeVisible();
  });

  test("happy path redirects to /check-email with the typed email", async ({
    page,
    deleteUser,
  }) => {
    const email = uniqueEmail("register-new");
    const password = "Correct-Horse-Battery-9";

    try {
      await bootApp(page);
      await navigateTo(page, "/register");
      await page.getByLabel(/display name/i).fill("New Op");
      await page.getByRole("textbox", { name: /email/i }).fill(email);
      await page.locator('input[type="password"]').first().fill(password);
      await page.locator('input[type="password"]').nth(1).fill(password);
      await page
        .getByRole("button", { name: /create operator|initialize session|create account/i })
        .click();

      await waitForRoute(page, /\/check-email/, { timeout: 10_000 });
      await expect(page.getByText(/inbox incoming/i)).toBeVisible();
      await expect(page.getByText(email).first()).toBeVisible();
    } finally {
      try {
        deleteUser(email);
      } catch {
        // registration may have failed before creating a row
      }
    }
  });

  test("mismatched passwords surface a form error", async ({ page }) => {
    await bootApp(page);
    await navigateTo(page, "/register");
    await page.getByRole("textbox", { name: /email/i }).fill(uniqueEmail("mismatch"));
    await page.locator('input[type="password"]').first().fill("Correct-Horse-Battery-9");
    await page.locator('input[type="password"]').nth(1).fill("Different-Password-9");
    await page
      .getByRole("button", { name: /create operator|initialize session|create account/i })
      .click();

    // react-hook-form + zod surfaces this message next to the field.
    await expect(page.getByText(/passwords do not match/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  test("'Sign In' link navigates back to /login", async ({ page }) => {
    await bootApp(page);
    await navigateTo(page, "/register");
    await page.getByRole("button", { name: /authorize|sign in/i }).click();
    await waitForRoute(page, /\/login/);
  });
});
