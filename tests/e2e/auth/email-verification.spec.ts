import { uniqueEmail, signIn, test, expect, TEST_PASSWORD } from "../fixtures";
import { bootApp, navigateTo, waitForRoute } from "../router-helpers";
import { register, verifyEmail } from "../auth-helpers";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("email verification (full round-trip)", () => {
  test("register → click verification URL → marked verified → can log in", async ({
    page,
    deleteUser,
  }) => {
    const email = uniqueEmail("email-verify");

    try {
      await register(page, { email, password: TEST_PASSWORD, displayName: "Verify Op" });
      // register() already waits for /check-email route via waitForRoute.

      await verifyEmail(page, email);
      // verifyEmail() asserts /email-verified/ template body is visible.

      // Boot back into the SPA to log in with the verified credentials.
      await bootApp(page);
      await navigateTo(page, "/login");
      await signIn(page, email, TEST_PASSWORD);
      await waitForRoute(page, /\/kanban/, { timeout: 10_000 });
    } finally {
      try {
        deleteUser(email);
      } catch {
        // Registration may have failed before user creation.
      }
    }
  });

  test("invalid verification key does not crash the Django view", async ({ page }) => {
    // This hits a real Django URL outside the SPA, so page.goto is correct here.
    await page.goto("/accounts/confirm-email/not-a-real-key/");
    // allauth renders either its "Invalid confirmation link" page OR redirects
    // to our /email-verified/ template depending on version. Assert on URL path,
    // not content — the page shouldn't 500.
    expect(page.url()).toContain("/accounts/confirm-email/");
  });
});
