import { test, expect, revokeAllTokens, signIn } from "../fixtures";
import { bootApp, navigateTo, waitForRoute, currentRoute } from "../router-helpers";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("session expiry", () => {
  test("revoking all tokens server-side → next request bounces to /login", async ({
    page,
    seedUser,
  }) => {
    const user = seedUser("session-expiry");
    await bootApp(page);
    await navigateTo(page, "/login");
    await signIn(page, user.email, user.password);
    await waitForRoute(page, /\/kanban/, { timeout: 10_000 });
    expect(await currentRoute(page)).toContain("/kanban");

    revokeAllTokens(user.email);
    await page.reload();
    await waitForRoute(page, /\/login/, { timeout: 10_000 });

    const tokenInStorage = await page.evaluate(() => localStorage.getItem("sofi:e2e-token"));
    expect(tokenInStorage).toBeNull();
  });
});
