import { expect, signIn, test } from "../fixtures";
import { bootApp, currentRoute, navigateTo, waitForRoute } from "../router-helpers";

/**
 * Anonymous tests — opt out of the saved storage state so each spec
 * starts at /login with no cookies.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("login page", () => {
  test("renders the branded login card", async ({ page }) => {
    await bootApp(page);
    await navigateTo(page, "/login");
    await expect(page.getByRole("heading", { name: /authorize operator/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("wrong password shows error banner, not the resend CTA", async ({ page, seedUser }) => {
    const user = seedUser("login-wrong-pw");
    await bootApp(page);
    await navigateTo(page, "/login");
    await signIn(page, user.email, "ObviouslyWrong1");

    await expect(
      page.getByText(/unable to log in|invalid email or password/i),
    ).toBeVisible({ timeout: 5_000 });
    // Resend button only appears for the email_not_verified path.
    await expect(
      page.getByRole("button", { name: /resend verification email/i }),
    ).toHaveCount(0);
  });

  test("happy path lands on /kanban", async ({ page, seedUser }) => {
    const user = seedUser("login-happy");
    await bootApp(page);
    await navigateTo(page, "/login");
    await signIn(page, user.email, user.password);

    await waitForRoute(page, /\/kanban/, { timeout: 10_000 });
    expect(await currentRoute(page)).toMatch(/\/kanban/);
  });

  test("'Request access' link navigates to /register", async ({ page }) => {
    await bootApp(page);
    await navigateTo(page, "/login");
    await page.getByRole("button", { name: /request access/i }).click();
    await waitForRoute(page, /\/register/);
    await expect(page.getByRole("heading", { name: /create|request access/i })).toBeVisible();
  });
});
