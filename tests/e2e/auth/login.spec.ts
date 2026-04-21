import { expect, signIn, test } from "../fixtures";

/**
 * Anonymous tests — opt out of the saved storage state so each spec
 * starts at /login with no cookies.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("login page", () => {
  test("renders the branded login card", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /authorize operator/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("wrong password shows error banner, not the resend CTA", async ({ page, seedUser }) => {
    const user = seedUser("login-wrong-pw");
    await page.goto("/login");
    await signIn(page, user.email, "ObviouslyWrong1");

    await expect(page.getByText(/unable to log in/i)).toBeVisible({ timeout: 5_000 });
    // Resend button only appears for the email_not_verified path.
    await expect(
      page.getByRole("button", { name: /resend verification email/i }),
    ).toHaveCount(0);
  });

  test("happy path lands on /kanban", async ({ page, seedUser }) => {
    const user = seedUser("login-happy");
    await page.goto("/login");
    await signIn(page, user.email, user.password);

    await page.waitForURL(/\/kanban/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/kanban/);
  });

  test("'Request access' link navigates to /register", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /request access/i }).click();
    await page.waitForURL(/\/register/);
    await expect(page.getByRole("heading", { name: /create/i })).toBeVisible();
  });
});
