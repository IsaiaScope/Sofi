import { expect, openUserMenu, test } from "../fixtures";

/**
 * Uses the `chromium-auth` project's shared storage state — this spec
 * starts already logged in via `auth.setup.ts`.
 */

async function signOut(page: Parameters<typeof openUserMenu>[0]): Promise<void> {
  await openUserMenu(page);
  await page.getByRole("menuitem", { name: /sign out/i }).click();
}

test.describe("logout", () => {
  test("sign out from the top-bar menu lands on /login", async ({ page }) => {
    await page.goto("/");
    await signOut(page);

    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("after signout, direct / navigation bounces back to login", async ({ page }) => {
    await page.goto("/");
    await signOut(page);
    await page.waitForURL(/\/login/);

    // _authenticated.beforeLoad guard should redirect.
    await page.goto("/");
    await page.waitForURL(/\/login/);
  });
});
