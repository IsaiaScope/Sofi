import { expect, openUserMenu, signIn, test } from "../fixtures";
import { bootApp, navigateTo, waitForRoute } from "../router-helpers";

test.use({ storageState: { cookies: [], origins: [] } });  // opt out of shared auth

async function signOut(page: Parameters<typeof openUserMenu>[0]): Promise<void> {
  await openUserMenu(page);
  await page.getByRole("menuitem", { name: /sign out/i }).click();
}

test.describe("logout", () => {
  test("sign out from the top-bar menu lands on /login", async ({ page, seedUser }) => {
    const user = seedUser("logout-signout");
    await bootApp(page);
    await navigateTo(page, "/login");
    await signIn(page, user.email, user.password);
    await waitForRoute(page, /\/kanban/, { timeout: 10_000 });

    await signOut(page);
    await waitForRoute(page, /\/login/, { timeout: 10_000 });
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("after signout, direct /kanban navigation bounces back to login", async ({
    page,
    seedUser,
  }) => {
    const user = seedUser("logout-bounce");
    await bootApp(page);
    await navigateTo(page, "/login");
    await signIn(page, user.email, user.password);
    await waitForRoute(page, /\/kanban/, { timeout: 10_000 });

    await signOut(page);
    await waitForRoute(page, /\/login/);

    await navigateTo(page, "/kanban");
    await waitForRoute(page, /\/login/);
  });
});
