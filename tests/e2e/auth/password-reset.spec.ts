import { signIn, test, expect } from "../fixtures";
import { bootApp, navigateTo, waitForRoute } from "../router-helpers";
import { completePasswordReset, requestPasswordReset } from "../auth-helpers";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("password reset", () => {
  test("full reset flow: request → confirm → login with new password", async ({
    page,
    seedUser,
  }) => {
    const user = seedUser("pwreset-flow");
    const newPassword = "Rotated-Pass-9";

    await requestPasswordReset(page, user.email);
    await completePasswordReset(page, user.email, newPassword);

    await page.getByRole("button", { name: /sign in/i }).click();
    await waitForRoute(page, /\/login/);

    await signIn(page, user.email, newPassword);
    await waitForRoute(page, /\/kanban/, { timeout: 10_000 });
  });

  test("request reset for unknown email still shows success (anti-enumeration)", async ({
    page,
  }) => {
    await bootApp(page);
    await navigateTo(page, "/recover");
    // Use role-based textbox locator to avoid strict mode collision with
    // TanStack Router devtools buttons that have aria-labels containing "email".
    await page.getByRole("textbox", { name: /email/i }).fill("ghost-user@test.sofi.local");
    await page.getByRole("button", { name: /dispatch|send/i }).click();
    // Use role-based heading locator to avoid strict-mode collision with the
    // status bar span that also contains "link dispatched".
    await expect(page.getByRole("heading", { name: /link dispatched/i })).toBeVisible({
      timeout: 5_000,
    });
  });

  test("confirm with bogus token shows the expired-link fault swap", async ({ page }) => {
    await bootApp(page);
    await navigateTo(page, "/recover/confirm", { uid: "MQ", token: "totally-bogus-token" });
    await page.locator('input[type="password"]').first().fill("Whatever-9");
    await page.locator('input[type="password"]').nth(1).fill("Whatever-9");
    await page.getByRole("button", { name: /commit|reset/i }).click();
    await expect(page.getByRole("heading", { name: /link expired/i })).toBeVisible({
      timeout: 5_000,
    });
  });
});
